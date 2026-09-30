import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SpecCoverageCollector, mergeCoverage, sanitizeCoverage } from './specCoverage';

const fileCoverage = (statementHits: number, functionHits: number, branchHits: number[]) => ({
  path: '/repo/source.ts',
  statementMap: { '0': { start: {}, end: {} } },
  fnMap: { '0': { name: 'example', decl: {}, loc: {} } },
  branchMap: { '0': { type: 'if', locations: [] } },
  s: { '0': statementHits },
  f: { '0': functionHits },
  b: { '0': branchHits },
});

describe('spec coverage collection', () => {
  it('removes module federation runtime URLs', () => {
    const result = sanitizeCoverage({
      '/repo/source.ts': fileCoverage(1, 1, [1, 0]),
      'data:text/javascript,module': fileCoverage(1, 1, [1]),
      '/repo/__module_federation/runtime.ts': fileCoverage(1, 1, [1]),
    });

    assert.deepEqual(Object.keys(result), ['/repo/source.ts']);
  });

  it('adds counters emitted across multiple page loads in one spec', () => {
    const result = mergeCoverage(
      { '/repo/source.ts': fileCoverage(1, 0, [1, 0]) },
      { '/repo/source.ts': fileCoverage(2, 1, [0, 3]) },
    );

    assert.deepEqual(result['/repo/source.ts'].s, { '0': 3 });
    assert.deepEqual(result['/repo/source.ts'].f, { '0': 1 });
    assert.deepEqual(result['/repo/source.ts'].b, { '0': [1, 3] });
  });

  it('writes an indexed report for each completed spec', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'odh-spec-coverage-'));
    try {
      const collector = new SpecCoverageCollector(directory, 'test-sha');
      collector.start('../observability/cypress/tests/dashboard.cy.ts');
      collector.collect(JSON.stringify({ '/repo/source.ts': fileCoverage(1, 1, [1, 0]) }));
      collector.finish(true);

      const index = JSON.parse(fs.readFileSync(path.join(directory, 'index.json'), 'utf8')) as {
        commit: string;
        specs: { spec: string; file: string; passed: boolean; sourceFiles: number }[];
      };
      assert.equal(index.commit, 'test-sha');
      assert.deepEqual(index.specs[0], {
        spec: '../observability/cypress/tests/dashboard.cy.ts',
        file: index.specs[0].file,
        passed: true,
        sourceFiles: 1,
      });
      assert.equal(fs.existsSync(path.join(directory, index.specs[0].file)), true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
