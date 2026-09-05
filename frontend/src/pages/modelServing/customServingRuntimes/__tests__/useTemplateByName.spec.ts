import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { useTemplates } from '#~/api';
import { useTemplateByName } from '#~/pages/modelServing/customServingRuntimes/useTemplateByName';

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'opendatahub' }),
}));

jest.mock('#~/api', () => ({
  useTemplates: jest.fn(),
}));

const useTemplatesMock = jest.mocked(useTemplates);

describe('useTemplateByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTemplatesMock.mockReturnValue([[], false, undefined]);
  });

  it('should return undefined when no template name is provided', () => {
    useTemplatesMock.mockReturnValue([[], true, undefined]);
    const renderResult = testHook(useTemplateByName)(undefined);
    expect(renderResult.result.current[0]).toBeUndefined();
    expect(renderResult.result.current[1]).toBe(true);
  });

  it('should find a template in the global namespace', () => {
    const globalTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'ovms-template',
      namespace: 'opendatahub',
    });
    useTemplatesMock.mockImplementation((ns) => {
      if (ns === 'opendatahub') {
        return [[globalTemplate], true, undefined];
      }
      return [[], true, undefined];
    });

    const renderResult = testHook(useTemplateByName)('ovms-template');
    expect(renderResult.result.current[0]).toBe(globalTemplate);
    expect(renderResult.result.current[1]).toBe(true);
    expect(renderResult.result.current[2]).toBeUndefined();
  });

  it('should find a template in the project namespace when not in global', () => {
    const projectTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'project-template',
      namespace: 'my-project',
    });
    useTemplatesMock.mockImplementation((ns) => {
      if (ns === 'opendatahub') {
        return [[], true, undefined];
      }
      if (ns === 'my-project') {
        return [[projectTemplate], true, undefined];
      }
      return [[], true, undefined];
    });

    const renderResult = testHook(useTemplateByName)('project-template', 'my-project');
    expect(renderResult.result.current[0]).toBe(projectTemplate);
    expect(renderResult.result.current[1]).toBe(true);
    expect(renderResult.result.current[2]).toBeUndefined();
  });

  it('should prefer the global template over the project template', () => {
    const globalTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'ovms-template',
      namespace: 'opendatahub',
    });
    const projectTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'ovms-template',
      namespace: 'my-project',
    });
    useTemplatesMock.mockImplementation((ns) => {
      if (ns === 'opendatahub') {
        return [[globalTemplate], true, undefined];
      }
      if (ns === 'my-project') {
        return [[projectTemplate], true, undefined];
      }
      return [[], true, undefined];
    });

    const renderResult = testHook(useTemplateByName)('ovms-template', 'my-project');
    expect(renderResult.result.current[0]).toBe(globalTemplate);
  });

  it('should not query project namespace when it matches dashboard namespace', () => {
    const globalTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'ovms-template',
      namespace: 'opendatahub',
    });
    useTemplatesMock.mockImplementation((ns) => {
      if (ns === 'opendatahub') {
        return [[globalTemplate], true, undefined];
      }
      return [[], false, undefined];
    });

    const renderResult = testHook(useTemplateByName)('ovms-template', 'opendatahub');
    expect(renderResult.result.current[0]).toBe(globalTemplate);
    expect(renderResult.result.current[1]).toBe(true);
    // useTemplates should not be called with undefined for the project when it matches global
    expect(useTemplatesMock).toHaveBeenCalledWith('opendatahub');
    expect(useTemplatesMock).toHaveBeenCalledWith(undefined);
    expect(useTemplatesMock).toHaveBeenCalledTimes(2);
  });

  it('should show template removed when not found in either namespace', () => {
    useTemplatesMock.mockReturnValue([[], true, undefined]);

    const renderResult = testHook(useTemplateByName)('missing-template', 'my-project');
    expect(renderResult.result.current[0]).toBeUndefined();
    expect(renderResult.result.current[1]).toBe(true);
    expect(renderResult.result.current[2]).toBeUndefined();
  });

  it('should not be loaded until both namespaces are loaded', () => {
    useTemplatesMock.mockImplementation((ns) => {
      if (ns === 'opendatahub') {
        return [[], true, undefined];
      }
      if (ns === 'my-project') {
        return [[], false, undefined];
      }
      return [[], false, undefined];
    });

    const renderResult = testHook(useTemplateByName)('template', 'my-project');
    expect(renderResult.result.current[1]).toBe(false);
  });

  it('should propagate global namespace error', () => {
    const testError = new Error('fetch failed');
    useTemplatesMock.mockImplementation((ns) => {
      if (ns === 'opendatahub') {
        return [[], true, testError];
      }
      return [[], true, undefined];
    });

    const renderResult = testHook(useTemplateByName)('template', 'my-project');
    expect(renderResult.result.current[2]).toBe(testError);
  });
});
