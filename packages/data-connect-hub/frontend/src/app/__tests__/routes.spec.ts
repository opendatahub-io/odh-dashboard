import { connectionDetailsRoute, projectHomeRoute } from '~/app/routes';

describe('Data Connect Hub routes', () => {
  it('should use federated route bases', () => {
    expect(projectHomeRoute('my-namespace')).toBe('/projects/my-namespace');
    expect(connectionDetailsRoute('connection-id', 'my-namespace')).toBe(
      '/ai-hub/connections/connections/connection-id?project=my-namespace',
    );
  });

  it('should use the standalone route base and omit the project link', () => {
    jest.isolateModules(() => {
      jest.doMock('~/app/utilities/const', () => ({ DEPLOYMENT_MODE: 'standalone' }));
      try {
        const standaloneRoutes = jest.requireActual(
          '~/app/routes',
        ) as typeof import('~/app/routes');
        expect(standaloneRoutes.projectHomeRoute('my-namespace')).toBeUndefined();
        expect(standaloneRoutes.connectionDetailsRoute('connection-id', 'my-namespace')).toBe(
          '/main-view/connections/connection-id?project=my-namespace',
        );
      } finally {
        jest.dontMock('~/app/utilities/const');
      }
    });
  });
});
