import { setWorkspaceParam } from '../routes';

describe('setWorkspaceParam', () => {
  it('should add the workspace to the catalog path', () => {
    expect(setWorkspaceParam('/ai-hub/skills', '', 'my-project')).toBe(
      '/ai-hub/skills?workspace=my-project',
    );
  });

  it('should keep an encoded skill path as one segment', () => {
    expect(setWorkspaceParam('/ai-hub/skills/%40acme%2Fcode-review', '', 'my-project')).toBe(
      '/ai-hub/skills/%40acme%2Fcode-review?workspace=my-project',
    );
  });

  it('should keep the version and other params', () => {
    expect(
      setWorkspaceParam('/ai-hub/skills/@acme/code-review', '?version=2&tab=files', 'my-project'),
    ).toBe('/ai-hub/skills/@acme/code-review?version=2&tab=files&workspace=my-project');
  });

  it('should replace an existing workspace', () => {
    expect(
      setWorkspaceParam(
        '/ai-hub/skills/@acme/code-review',
        '?workspace=missing-project&version=2',
        'my-project',
      ),
    ).toBe('/ai-hub/skills/@acme/code-review?workspace=my-project&version=2');
  });
});
