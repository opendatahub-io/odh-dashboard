import { filterVirtualModuleCoverage } from '../filterVirtualModuleCoverage';

describe('filterVirtualModuleCoverage', () => {
  it('removes virtual module coverage entries', () => {
    const filtered = filterVirtualModuleCoverage({
      '/app/src/foo.ts': { path: '/app/src/foo.ts' },
      'data:text/javascript,inline': { path: 'data:text/javascript,inline' },
      '__module_federation/runtime': { path: '__module_federation/runtime' },
    });

    expect(Object.keys(filtered)).to.deep.equal(['/app/src/foo.ts']);
  });
});
