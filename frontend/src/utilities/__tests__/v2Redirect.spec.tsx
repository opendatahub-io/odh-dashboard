import React from 'react';
import { render } from '@testing-library/react';
import { Navigate, Location, useParams, useLocation } from 'react-router-dom';
import { buildV2RedirectElement, buildV2RedirectRoutes } from '#~/utilities/v2Redirect';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useLocation: jest.fn(),
  Navigate: jest.fn(() => <div data-testid="navigate">Navigate</div>),
  Route: jest.fn(({ element }) => element),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;
const mockNavigate = Navigate as jest.MockedFunction<typeof Navigate>;

const getNavigateProps = () => {
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  return mockNavigate.mock.calls[0][0];
};

const createMockLocation = (pathname: string, search = '', hash = ''): Location => ({
  pathname,
  search,
  hash,
  state: null,
  key: 'test-key',
});

describe('v2Redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WildcardRedirect scenarios', () => {
    it('should redirect simple wildcard path without trailing slash', () => {
      mockUseParams.mockReturnValue({ '*': '' });
      mockUseLocation.mockReturnValue(createMockLocation('/test/settings'));

      const element = buildV2RedirectElement({
        from: '/test/settings/*',
        to: '/new/config/settings/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings',
        state: null,
        replace: true,
      });
    });

    it('should redirect wildcard path with content', () => {
      mockUseParams.mockReturnValue({ '*': 'permissions/test-registry' });
      mockUseLocation.mockReturnValue(
        createMockLocation('/test/settings/permissions/test-registry'),
      );

      const element = buildV2RedirectElement({
        from: '/test/settings/*',
        to: '/new/config/settings/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings/permissions/test-registry',
        state: null,
        replace: true,
      });
    });

    it('should redirect wildcard with optional parameters', () => {
      mockUseParams.mockReturnValue({
        namespace: 'test-project',
        '*': 'resources',
      });
      mockUseLocation.mockReturnValue(createMockLocation('/old/service/test-project/resources'));

      const element = buildV2RedirectElement({
        from: '/old/service/:namespace?/*',
        to: '/new/api/service/:namespace?/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/api/service/test-project/resources',
        state: null,
        replace: true,
      });
    });

    it('should redirect wildcard with missing optional parameters', () => {
      mockUseParams.mockReturnValue({ '*': 'resources' });
      mockUseLocation.mockReturnValue(createMockLocation('/old/service/resources'));

      const element = buildV2RedirectElement({
        from: '/old/service/:namespace?/*',
        to: '/new/api/service/:namespace?/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/api/service/resources',
        state: null,
        replace: true,
      });
    });

    it('should preserve query parameters and hash in wildcard redirects', () => {
      mockUseParams.mockReturnValue({ '*': 'add-runtime' });
      mockUseLocation.mockReturnValue(
        createMockLocation(
          '/old/runtimes/add-runtime',
          '?param1=value1&param2=value2',
          '#section1',
        ),
      );

      const element = buildV2RedirectElement({
        from: '/old/runtimes/*',
        to: '/new/config/runtimes/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/runtimes/add-runtime?param1=value1&param2=value2#section1',
        state: null,
        replace: true,
      });
    });

    it('should preserve URL encoding in wildcard paths', () => {
      mockUseParams.mockReturnValue({ '*': 'Red Hat/rhelai1/granite-8b-code-instruct/1.3.0' });
      mockUseLocation.mockReturnValue(
        createMockLocation(
          '/modelCatalog/Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3%252E0',
        ),
      );

      const element = buildV2RedirectElement({
        from: '/modelCatalog/*',
        to: '/ai-hub/catalog/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/ai-hub/catalog/Red%20Hat/rhelai1/granite-8b-code-instruct/1%252E3%252E0',
        state: null,
        replace: true,
      });
    });
  });

  describe('RelativeRedirect scenarios', () => {
    it('should redirect simple relative path segment', () => {
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue(createMockLocation('/test/monitor/metrics/oldStatus'));

      const element = buildV2RedirectElement({
        from: 'oldStatus',
        to: 'new-status',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/monitor/metrics/new-status',
        state: null,
        replace: true,
      });
    });

    it('should redirect relative path with parameters', () => {
      mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
      mockUseLocation.mockReturnValue(
        createMockLocation('/test/monitor/metrics/oldStatus/test-namespace'),
      );

      const element = buildV2RedirectElement({
        from: 'oldStatus/:namespace?',
        to: 'new-status/:namespace?',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/monitor/metrics/new-status/test-namespace',
        state: null,
        replace: true,
      });
    });

    it('should preserve query parameters in relative redirects', () => {
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue(
        createMockLocation(
          '/test/app/runs/project-a/oldCompare',
          '?compareIds=id1,id2,id3&mode=advanced',
        ),
      );

      const element = buildV2RedirectElement({
        from: 'oldCompare',
        to: 'new-compare',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/app/runs/project-a/new-compare?compareIds=id1,id2,id3&mode=advanced',
        state: null,
        replace: true,
      });
    });

    it('should handle complex nested redirects with parameters', () => {
      mockUseParams.mockReturnValue({
        modelId: 'test-model-123',
      });
      mockUseLocation.mockReturnValue(
        createMockLocation('/test/registry/oldModels/test-model-123/oldAction'),
      );

      const element = buildV2RedirectElement({
        from: 'oldModels/:modelId/oldAction',
        to: 'new-models/:modelId/new-action',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/registry/new-models/test-model-123/new-action',
        state: null,
        replace: true,
      });
    });
  });

  describe('Absolute redirects', () => {
    it('should handle simple absolute redirects', () => {
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue(createMockLocation('/old/settings'));

      const element = buildV2RedirectElement({
        from: '/old/settings',
        to: '/new/config/settings',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings',
        state: null,
        replace: true,
      });
    });

    it('should preserve query parameters and hash in absolute redirects', () => {
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue(
        createMockLocation('/old/settings', '?tab=users', '#section1'),
      );

      const element = buildV2RedirectElement({
        from: '/old/settings',
        to: '/new/config/settings',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings',
        state: null,
        replace: true,
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty wildcard paths', () => {
      mockUseParams.mockReturnValue({ '*': '' });
      mockUseLocation.mockReturnValue(createMockLocation('/old/runtimes'));

      const element = buildV2RedirectElement({
        from: '/old/runtimes/*',
        to: '/new/config/runtimes/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/runtimes',
        state: null,
        replace: true,
      });
    });

    it('should fallback to params wildcard when pathname does not start with basePath', () => {
      mockUseParams.mockReturnValue({ '*': 'fallback/content' });
      mockUseLocation.mockReturnValue(createMockLocation('/different/path/structure'));

      const element = buildV2RedirectElement({
        from: '/old/settings/*',
        to: '/new/config/settings/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings/fallback/content',
        state: null,
        replace: true,
      });
    });

    it('should handle empty string when pathname does not match basePath and no params wildcard', () => {
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue(createMockLocation('/completely/different/path'));

      const element = buildV2RedirectElement({
        from: '/old/settings/*',
        to: '/new/config/settings/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings',
        state: null,
        replace: true,
      });
    });

    it('should handle empty params wildcard when pathname does not match basePath', () => {
      mockUseParams.mockReturnValue({ '*': '' });
      mockUseLocation.mockReturnValue(createMockLocation('/unrelated/path'));

      const element = buildV2RedirectElement({
        from: '/old/settings/*',
        to: '/new/config/settings/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings',
        state: null,
        replace: true,
      });
    });

    it('should use pathname slice when pathname starts with basePath for routes without parameters', () => {
      mockUseParams.mockReturnValue({ '*': 'should-not-be-used' });
      mockUseLocation.mockReturnValue(createMockLocation('/old/settings/actual/path/content'));

      const element = buildV2RedirectElement({
        from: '/old/settings/*',
        to: '/new/config/settings/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings/actual/path/content',
        state: null,
        replace: true,
      });
    });

    it('should clean up double slashes', () => {
      mockUseParams.mockReturnValue({
        namespace: '',
        '*': 'resources',
      });
      mockUseLocation.mockReturnValue(createMockLocation('/test/app/resources'));

      const element = buildV2RedirectElement({
        from: '/test/app/:namespace?/*',
        to: '/new/app/:namespace?/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/app/resources',
        state: null,
        replace: true,
      });
    });

    it('should handle root redirect', () => {
      mockUseParams.mockReturnValue({ '*': '' });
      mockUseLocation.mockReturnValue(createMockLocation('/'));

      const element = buildV2RedirectElement({
        from: '/*',
        to: '/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '',
        state: null,
        replace: true,
      });
    });
  });

  describe('buildV2RedirectRoutes', () => {
    it('should create multiple redirect routes', () => {
      const redirectMap = {
        'old-path-1': 'new-path-1',
        'old-path-2': 'new-path-2',
        'old/:param/path': 'new/:param/path',
      };

      const routes = buildV2RedirectRoutes(redirectMap);

      expect(routes).toHaveLength(3);
      expect(Array.isArray(routes)).toBe(true);
    });

    it('should handle empty redirect map', () => {
      const routes = buildV2RedirectRoutes({});

      expect(routes).toHaveLength(0);
      expect(Array.isArray(routes)).toBe(true);
    });
  });

  describe('Complex scenarios with multiple parameters', () => {
    it('should handle nested paths with multiple parameters', () => {
      mockUseParams.mockReturnValue({
        registryId: 'test-registry',
        modelId: 'test-model',
      });
      mockUseLocation.mockReturnValue(
        createMockLocation(
          '/test/registry/oldModels/test-registry/models/test-model/versions/archive',
          '?tab=details',
          '#metrics',
        ),
      );

      const element = buildV2RedirectElement({
        from: 'oldModels/:registryId/models/:modelId/versions/archive',
        to: 'new-models/:registryId/models/:modelId/versions/archive',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/registry/new-models/test-registry/models/test-model/versions/archive?tab=details#metrics',
        state: null,
        replace: true,
      });
    });

    it('should handle workload metrics with namespace parameters', () => {
      mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
      mockUseLocation.mockReturnValue(
        createMockLocation('/test/monitor/metrics/oldMetrics/test-namespace', '?timeRange=7d'),
      );

      const element = buildV2RedirectElement({
        from: 'oldMetrics/:namespace?',
        to: 'new-metrics/:namespace?',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/monitor/metrics/new-metrics/test-namespace?timeRange=7d',
        state: null,
        replace: true,
      });
    });

    it('should handle comparison runs with query parameters', () => {
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue(
        createMockLocation('/test/app/runs/project-test/oldCompare', '?compareIds=run1,run2,run3'),
      );

      const element = buildV2RedirectElement({
        from: 'oldCompare',
        to: 'new-compare',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/app/runs/project-test/new-compare?compareIds=run1,run2,run3',
        state: null,
        replace: true,
      });
    });
  });

  describe('State preservation', () => {
    it('should preserve state in wildcard redirects', () => {
      const testState = { fromPage: 'settings', userAction: 'navigation' };
      mockUseParams.mockReturnValue({ '*': 'permissions' });
      mockUseLocation.mockReturnValue({
        ...createMockLocation('/old/settings/permissions'),
        state: testState,
      });

      const element = buildV2RedirectElement({
        from: '/old/settings/*',
        to: '/new/config/settings/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings/permissions',
        state: testState,
        replace: true,
      });
    });

    it('should preserve state in relative redirects', () => {
      const testState = { previousRoute: '/dashboard', timestamp: 1234567890 };
      mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
      mockUseLocation.mockReturnValue({
        ...createMockLocation('/test/monitor/metrics/oldStatus/test-namespace'),
        state: testState,
      });

      const element = buildV2RedirectElement({
        from: 'oldStatus/:namespace?',
        to: 'new-status/:namespace?',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/monitor/metrics/new-status/test-namespace',
        state: testState,
        replace: true,
      });
    });

    it('should preserve state in absolute redirects', () => {
      const testState = { modal: 'open', selectedTab: 'users' };
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue({
        ...createMockLocation('/old/settings', '?tab=permissions'),
        state: testState,
      });

      const element = buildV2RedirectElement({
        from: '/old/settings',
        to: '/new/config/settings',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/config/settings',
        state: testState,
        replace: true,
      });
    });

    it('should preserve complex state objects with nested data', () => {
      const testState = {
        user: { id: 123, name: 'John Doe' },
        preferences: { theme: 'dark', notifications: true },
        breadcrumbs: ['/home', '/settings'],
        metadata: { version: '2.0', lastModified: new Date('2023-01-01') },
      };
      mockUseParams.mockReturnValue({ '*': 'advanced/security' });
      mockUseLocation.mockReturnValue({
        ...createMockLocation('/old/config/advanced/security'),
        state: testState,
      });

      const element = buildV2RedirectElement({
        from: '/old/config/*',
        to: '/new/admin/config/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/admin/config/advanced/security',
        state: testState,
        replace: true,
      });
    });

    it('should preserve string state values', () => {
      const testState = 'returning-from-external-link';
      mockUseParams.mockReturnValue({});
      mockUseLocation.mockReturnValue({
        ...createMockLocation('/test/models/oldView'),
        state: testState,
      });

      const element = buildV2RedirectElement({
        from: 'oldView',
        to: 'new-view',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/test/models/new-view',
        state: testState,
        replace: true,
      });
    });

    it('should handle undefined state correctly', () => {
      mockUseParams.mockReturnValue({ '*': 'dashboard' });
      mockUseLocation.mockReturnValue({
        ...createMockLocation('/old/app/dashboard'),
        state: undefined,
      });

      const element = buildV2RedirectElement({
        from: '/old/app/*',
        to: '/new/application/*',
      });

      render(element);

      expect(getNavigateProps()).toEqual({
        to: '/new/application/dashboard',
        state: undefined,
        replace: true,
      });
    });
  });
});
