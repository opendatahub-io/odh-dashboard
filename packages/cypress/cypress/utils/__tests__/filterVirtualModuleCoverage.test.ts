import { filterVirtualModuleCoverage } from '../filterVirtualModuleCoverage';

describe('filterVirtualModuleCoverage', () => {
  it('removes data: URL coverage entries', () => {
    const filtered = filterVirtualModuleCoverage({
      '/app/src/foo.ts': { path: '/app/src/foo.ts' },
      'data:text/javascript,inline': { path: 'data:text/javascript,inline' },
    });

    expect(Object.keys(filtered)).to.deep.equal(['/app/src/foo.ts']);
  });
});
