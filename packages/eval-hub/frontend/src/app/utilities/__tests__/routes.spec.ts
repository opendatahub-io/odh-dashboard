import { evalHubRootPath, evalHubEvaluationsRoute } from '../routes';

describe('evalHubRootPath', () => {
  it('should be the full host path', () => {
    expect(evalHubRootPath).toBe('/develop-train/eval-hub');
  });
});

describe('evalHubEvaluationsRoute', () => {
  it('should return root path when no namespace is provided', () => {
    expect(evalHubEvaluationsRoute()).toBe('/develop-train/eval-hub');
  });

  it('should return root path when namespace is empty string', () => {
    expect(evalHubEvaluationsRoute('')).toBe('/develop-train/eval-hub');
  });

  it('should return namespaced path when namespace is provided', () => {
    expect(evalHubEvaluationsRoute('my-project')).toBe('/develop-train/eval-hub/my-project');
  });

  it('should handle namespace with special characters', () => {
    expect(evalHubEvaluationsRoute('my-project-123')).toBe(
      '/develop-train/eval-hub/my-project-123',
    );
  });
});
