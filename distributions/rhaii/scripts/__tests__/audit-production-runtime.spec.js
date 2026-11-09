/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { main } = require('../audit-production-runtime');
const { productionTargets, MODEL_SERVING_REMOTE_ENTRY } = require('../production-build');

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));
jest.mock('child_process', () => ({ execFileSync: jest.fn() }));

const repoRoot = path.resolve(__dirname, '../../../..');
const compilation = (legacy = false) => ({
  hash: 'build-hash',
  rspackVersion: 'test',
  errors: [],
  assets: [{ name: 'remoteEntry.js' }],
  chunks: [{ id: 1, initial: true, files: ['app.js', 'remoteEntry.js'] }],
  modules: [
    {
      identifier: `${repoRoot}/packages/model-serving/frontend/src/index.ts`,
      nameForCondition: `${repoRoot}/packages/model-serving/frontend/src/index.ts`,
      chunks: [1],
      reasons: [{ type: 'entry' }],
    },
    ...(legacy
      ? [
          {
            identifier: `${repoRoot}/frontend/src/legacy.ts`,
            nameForCondition: `${repoRoot}/frontend/src/legacy.ts`,
            chunks: [1],
            reasons: [],
          },
        ]
      : []),
  ],
});
const writtenReport = () =>
  JSON.parse(
    fs.writeFileSync.mock.calls.find(([filename]) => filename.endsWith('/report.json'))[1],
  );

describe('production audit command', () => {
  let previousExitCode;
  beforeEach(() => {
    jest.resetAllMocks();
    previousExitCode = process.exitCode;
    jest.replaceProperty(process, 'env', {
      ...process.env,
      MODEL_SERVING_REMOTE_ENTRY: '',
      RHAII_TILT_FIXTURES: 'false',
    });
    execFileSync.mockImplementation((command, args) => {
      if (command === 'git') return args[0] === 'rev-parse' ? 'revision\n' : '';
      return undefined;
    });
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((filename) =>
      JSON.stringify(compilation(filename.includes('/model-serving/'))),
    );
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
    jest.restoreAllMocks();
  });

  it('should build both production targets and include remote violations in the report', async () => {
    await main([]);
    const commands = execFileSync.mock.calls.filter(([command]) => command === process.execPath);
    expect(commands.map(([, args, options]) => [args[1], options.cwd])).toEqual([
      ['host', path.join(repoRoot, 'distributions/rhaii')],
      ['model-serving', path.join(repoRoot, 'packages/model-serving/frontend')],
    ]);
    expect(writtenReport()).toMatchObject({
      sourceRevision: 'revision',
      workingTreeDirty: false,
      modelServingRemote: MODEL_SERVING_REMOTE_ENTRY,
      boundaryPassed: false,
      summary: { violations: 1 },
    });
    expect(process.exitCode).toBe(previousExitCode);
  });

  it('should fail strict mode when only the remote violates the boundary', async () => {
    await main(['--check']);
    expect(process.exitCode).toBe(1);
  });

  it.each(['https://example.test/remoteEntry.js', '/_mf/other/remoteEntry.js'])(
    'should reject an unaudited remote URL (%s)',
    async (url) => {
      process.env.MODEL_SERVING_REMOTE_ENTRY = url;
      await expect(main([])).rejects.toThrow("Only the image's locally built remote");
      expect(execFileSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    },
  );

  it('should accept the exact shipped remote URL', async () => {
    process.env.MODEL_SERVING_REMOTE_ENTRY = MODEL_SERVING_REMOTE_ENTRY;
    await main([]);
    expect(writtenReport().builds).toHaveLength(2);
  });

  it('should remove stale reports and never write a result after a remote build failure', async () => {
    execFileSync.mockImplementation((command, args) => {
      if (command === 'git') return args[0] === 'rev-parse' ? 'revision\n' : '';
      if (args[1] === 'model-serving') throw new Error('Remote build failed');
      return undefined;
    });
    await expect(main([])).rejects.toThrow('Remote build failed');
    expect(fs.rmSync.mock.calls.some(([filename]) => filename.endsWith('/report.json'))).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should reject a build that did not emit its remote entry asset', async () => {
    fs.existsSync.mockReturnValue(false);
    await expect(main([])).rejects.toThrow('did not emit remoteEntry.js');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should keep the audit production profile aligned with the image build', () => {
    const dockerfile = jest
      .requireActual('fs')
      .readFileSync(path.join(repoRoot, 'distributions/rhaii/Dockerfile'), 'utf8');
    expect(dockerfile).toContain(`ARG MODEL_SERVING_REMOTE_ENTRY="${MODEL_SERVING_REMOTE_ENTRY}"`);
    expect(dockerfile).toContain(
      `ENV DEPLOYMENT_MODE=${productionTargets['model-serving'].environment.DEPLOYMENT_MODE}`,
    );
    expect(dockerfile).toContain(
      `ENV PUBLIC_PATH=${productionTargets['model-serving'].environment.PUBLIC_PATH}`,
    );
    for (const target of Object.values(productionTargets)) {
      expect(dockerfile).toContain(`WORKDIR /usr/src/workspace/${target.workspace}`);
    }
  });
});
