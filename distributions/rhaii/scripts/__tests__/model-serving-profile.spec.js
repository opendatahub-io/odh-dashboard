/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getModelServingProfileEnvironment, main } = require('../model-serving-profile');

jest.mock('child_process', () => ({ spawnSync: jest.fn() }));

describe('RHAII Model Serving profile', () => {
  let previousExitCode;
  beforeEach(() => {
    previousExitCode = process.exitCode;
    spawnSync.mockReset();
    spawnSync.mockReturnValue({ status: 0 });
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
    jest.restoreAllMocks();
  });

  it('should select the distribution-owned profile', () => {
    expect(getModelServingProfileEnvironment()).toEqual({
      MODEL_SERVING_EXTENSION_PROFILE: 'deployments',
    });
    jest.spyOn(fs, 'readFileSync').mockReturnValue('extensionProfiles:\n  modelServing: full');
    expect(getModelServingProfileEnvironment()).toEqual({
      MODEL_SERVING_EXTENSION_PROFILE: 'full',
    });
  });

  it.each(['{}', 'extensionProfiles: {}', 'extensionProfiles: {modelServing: ""}'])(
    'should reject missing or empty selection (%s)',
    (config) => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(config);
      expect(() => main(['build:prod'])).toThrow(
        'distribution.yaml must define extensionProfiles.modelServing',
      );
      expect(spawnSync).not.toHaveBeenCalled();
    },
  );

  it.each(['build:prod', 'start:dev'])(
    'should run %s with the same selected profile and preserve caller settings',
    (script) => {
      jest.replaceProperty(process, 'env', {
        ...process.env,
        MODEL_SERVING_EXTENSION_PROFILE: 'full',
        DEPLOYMENT_MODE: 'federated',
        PUBLIC_PATH: '/_mf/modelServing/',
      });
      main([script]);
      expect(spawnSync).toHaveBeenCalledWith('pnpm', ['run', script], {
        cwd: path.resolve(__dirname, '../../../../packages/model-serving/frontend'),
        env: {
          ...process.env,
          MODEL_SERVING_EXTENSION_PROFILE: 'deployments',
        },
        stdio: 'inherit',
      });
      expect(process.exitCode).toBe(0);
    },
  );

  it.each([{ args: [] }, { args: ['other'] }, { args: ['build:prod', 'extra'] }])(
    'should reject unsupported command arguments ($args)',
    ({ args }) => {
      expect(() => main(args)).toThrow('Expected a Model Serving script');
      expect(spawnSync).not.toHaveBeenCalled();
    },
  );

  it('should propagate failed builds', () => {
    spawnSync.mockReturnValue({ status: 2 });
    main(['build:prod']);
    expect(process.exitCode).toBe(2);

    spawnSync.mockReturnValue({ error: new Error('Could not spawn pnpm') });
    expect(() => main(['build:prod'])).toThrow('Could not spawn pnpm');

    spawnSync.mockReturnValue({ signal: 'SIGTERM' });
    expect(() => main(['build:prod'])).toThrow('Model Serving build stopped by SIGTERM');
  });
});
