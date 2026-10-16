import { SKILL_REGISTRY_BASENAME, skillRegistryBaseRoute } from '../const';

describe('skillRegistryBaseRoute', () => {
  it('should return the bare basename when no namespace is provided', () => {
    expect(skillRegistryBaseRoute()).toBe(SKILL_REGISTRY_BASENAME);
  });

  it('should return the bare basename when namespace is an empty string', () => {
    expect(skillRegistryBaseRoute('')).toBe(SKILL_REGISTRY_BASENAME);
  });

  it('should append the workspace query param when a namespace is provided', () => {
    expect(skillRegistryBaseRoute('my-project')).toBe(
      `${SKILL_REGISTRY_BASENAME}?workspace=my-project`,
    );
  });

  it('should URL-encode namespace values with special characters', () => {
    expect(skillRegistryBaseRoute('team a/b')).toBe(
      `${SKILL_REGISTRY_BASENAME}?workspace=team%20a%2Fb`,
    );
  });
});
