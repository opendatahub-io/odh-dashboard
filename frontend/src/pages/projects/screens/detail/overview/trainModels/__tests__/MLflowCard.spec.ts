import {
  setWorkspaceQueryParam,
  buildMLflowExperimentsWorkspaceHref,
} from '#~/pages/projects/screens/detail/overview/trainModels/MLflowCard';

describe('setWorkspaceQueryParam', () => {
  it('should add workspace param to a path without query string', () => {
    expect(setWorkspaceQueryParam('/experiments', 'my-project')).toBe(
      '/experiments?workspace=my-project',
    );
  });

  it('should add workspace param to a path with existing query string', () => {
    expect(setWorkspaceQueryParam('/experiments?foo=bar', 'my-project')).toBe(
      '/experiments?foo=bar&workspace=my-project',
    );
  });

  it('should override existing workspace param', () => {
    expect(setWorkspaceQueryParam('/experiments?workspace=old-project', 'new-project')).toBe(
      '/experiments?workspace=new-project',
    );
  });

  it('should handle empty path', () => {
    expect(setWorkspaceQueryParam('', 'my-project')).toBe('?workspace=my-project');
  });

  it('should handle path with multiple existing params', () => {
    expect(setWorkspaceQueryParam('/experiments?a=1&b=2', 'my-project')).toBe(
      '/experiments?a=1&b=2&workspace=my-project',
    );
  });

  it('should URL-encode special characters in workspace name', () => {
    const result = setWorkspaceQueryParam('/experiments', 'project with spaces');
    expect(result).toBe('/experiments?workspace=project+with+spaces');
  });

  it('should handle workspace name with ampersand', () => {
    const result = setWorkspaceQueryParam('/experiments', 'a&b');
    expect(result).toBe('/experiments?workspace=a%26b');
  });
});

describe('buildMLflowExperimentsWorkspaceHref', () => {
  it('should build href with hash path and workspace param', () => {
    expect(buildMLflowExperimentsWorkspaceHref('https://mlflow.example.com', 'my-project')).toBe(
      'https://mlflow.example.com/#/experiments?workspace=my-project',
    );
  });

  it('should strip trailing slashes from base href', () => {
    expect(buildMLflowExperimentsWorkspaceHref('https://mlflow.example.com/', 'my-project')).toBe(
      'https://mlflow.example.com/#/experiments?workspace=my-project',
    );
  });

  it('should strip multiple trailing slashes from base href', () => {
    expect(buildMLflowExperimentsWorkspaceHref('https://mlflow.example.com///', 'my-project')).toBe(
      'https://mlflow.example.com/#/experiments?workspace=my-project',
    );
  });

  it('should handle base href with path', () => {
    expect(
      buildMLflowExperimentsWorkspaceHref('https://mlflow.example.com/mlflow', 'test-ns'),
    ).toBe('https://mlflow.example.com/mlflow/#/experiments?workspace=test-ns');
  });

  it('should URL-encode the project name in the workspace param', () => {
    expect(buildMLflowExperimentsWorkspaceHref('https://mlflow.example.com', 'my project')).toBe(
      'https://mlflow.example.com/#/experiments?workspace=my+project',
    );
  });
});
