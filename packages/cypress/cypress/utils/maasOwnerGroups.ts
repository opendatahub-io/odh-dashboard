/**
 * Group names used on MaaSSubscription and MaaSAuthPolicy resources that MaaS e2e tests spin up
 * from stock fixtures (resources/maas/MaaSSubscription.yaml and MaaSAuthPolicy.yaml).
 * Use MAAS_OWNER_GROUPS in test-variables.yml whenever test users sit in different groups.
 */
export const DEFAULT_MAAS_OWNER_GROUPS: readonly string[] = ['rhods-admins', 'rhods-users'];

const OWNER_GROUPS_PLACEHOLDER = /\{\s*\{\s*OWNER_GROUPS\s*\}\s*\}/;

/**
 * Coerces MAAS_OWNER_GROUPS into group names—either an array of strings or one comma-separated value.
 * Returns a copy of the defaults only when the setting is absent (undefined or null). Throws when
 * it is set but names no group, so an empty value never grants the default groups.
 */
export const parseMaaSOwnerGroups = (value: unknown): string[] => {
  if (value === undefined || value === null) {
    return [...DEFAULT_MAAS_OWNER_GROUPS];
  }
  const entries = typeof value === 'string' ? value.split(',') : value;
  if (!Array.isArray(entries) || !entries.every((entry) => typeof entry === 'string')) {
    throw new Error('MAAS_OWNER_GROUPS must be a list of group names or a comma-separated string');
  }
  const groups = entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  if (groups.length === 0) {
    throw new Error(
      'MAAS_OWNER_GROUPS is set but names no group; set at least one group name, or remove the setting to use the defaults',
    );
  }
  return groups;
};

/**
 * Turns owner groups into the payload for `{{OWNER_GROUPS}}`: a flow-style YAML list expressed
 * as JSON with `{ name }` objects, analogous to USER_GROUPS in portal fixtures.
 */
export const formatMaaSOwnerGroups = (groups: readonly string[]): string =>
  JSON.stringify(groups.map((name) => ({ name })));

/**
 * OWNER_GROUPS substitution derived from MAAS_OWNER_GROUPS for fixture rendering. Stays empty when
 * yamlContent omits `{{OWNER_GROUPS}}` or fixtureReplacements already supplies OWNER_GROUPS, which
 * limits reading and validating the setting to default-fixture render paths.
 */
export const getOwnerGroupsReplacements = (
  yamlContent: string,
  fixtureReplacements: Record<string, string>,
  setting: unknown,
): Record<string, string> =>
  'OWNER_GROUPS' in fixtureReplacements || !OWNER_GROUPS_PLACEHOLDER.test(yamlContent)
    ? {}
    : { OWNER_GROUPS: formatMaaSOwnerGroups(parseMaaSOwnerGroups(setting)) };
