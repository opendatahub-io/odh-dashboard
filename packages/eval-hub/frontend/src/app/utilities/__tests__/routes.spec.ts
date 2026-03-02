import { evalHubRootPath, evalHubEvaluationsRoute } from '../routes';

describe('evalHubRootPath', () => {
  it('should be the full host path', () => {
    expect(evalHubRootPath).toBe('/evaluation');
  });
});

describe('evalHubEvaluationsRoute', () => {
  it('should return root path when no namespace is provided', () => {
    expect(evalHubEvaluationsRoute()).toBe('/evaluation');
  });

  it('should return root path when namespace is empty string', () => {
    expect(evalHubEvaluationsRoute('')).toBe('/evaluation');
  });

  it('should return namespaced path when namespace is provided', () => {
    expect(evalHubEvaluationsRoute('my-project')).toBe('/evaluation/my-project');
  });

  it('should handle namespace with special characters', () => {
    expect(evalHubEvaluationsRoute('my-project-123')).toBe('/evaluation/my-project-123');
  });
});
