import { projectHomeRoute } from '~/app/routes';

describe('projectHomeRoute', () => {
  it('should link to the host project details page in federated mode', () => {
    expect(projectHomeRoute('my-namespace')).toBe('/projects/my-namespace');
    expect(projectHomeRoute()).toBe('/projects');
  });

  it('should return undefined in standalone mode so the breadcrumb omits the project link', () => {
    jest.isolateModules(() => {
      jest.doMock('~/app/utilities/const', () => ({ DEPLOYMENT_MODE: 'standalone' }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { projectHomeRoute: standaloneProjectHomeRoute } = require('~/app/routes');
      expect(standaloneProjectHomeRoute('my-namespace')).toBeUndefined();
      expect(standaloneProjectHomeRoute()).toBeUndefined();
      jest.dontMock('~/app/utilities/const');
    });
  });
});
