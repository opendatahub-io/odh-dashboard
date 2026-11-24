import fs from 'fs';
import path from 'path';
import { describe, expect as assert, it } from '@jest/globals';
import YAML from 'yaml';
import {
  DEFAULT_MAAS_OWNER_GROUPS,
  formatMaaSOwnerGroups,
  getOwnerGroupsReplacements,
  parseMaaSOwnerGroups,
} from '../maasOwnerGroups';
import { replacePlaceholdersInYaml } from '../yaml_files';

const readFixture = (name: string): string =>
  fs.readFileSync(path.resolve(__dirname, '../../fixtures/resources/maas', name), 'utf8');

describe('parseMaaSOwnerGroups', () => {
  it.each([undefined, null])('returns the defaults when the setting is %p', (value) => {
    assert(parseMaaSOwnerGroups(value)).toEqual(['rhods-admins', 'rhods-users']);
  });

  it.each(['', ' ', ' , ', [], [''], ['', ' ']])(
    'rejects the explicitly empty setting %p',
    (value) => {
      assert(() => parseMaaSOwnerGroups(value)).toThrow(
        'MAAS_OWNER_GROUPS is set but names no group',
      );
    },
  );

  it('returns a copy of the defaults, not the shared list', () => {
    const groups = parseMaaSOwnerGroups(undefined);
    groups.push('changed');
    assert(DEFAULT_MAAS_OWNER_GROUPS).toEqual(['rhods-admins', 'rhods-users']);
  });

  it('reads a list of group names and trims them', () => {
    assert(parseMaaSOwnerGroups(['grid-admins', ' grid users '])).toEqual([
      'grid-admins',
      'grid users',
    ]);
  });

  it('reads a comma-separated string', () => {
    assert(parseMaaSOwnerGroups('grid-admins, grid-users')).toEqual(['grid-admins', 'grid-users']);
  });

  it('rejects values that are not group names', () => {
    assert(() => parseMaaSOwnerGroups([{ name: 'grid-admins' }])).toThrow(
      'MAAS_OWNER_GROUPS must be a list of group names or a comma-separated string',
    );
    assert(() => parseMaaSOwnerGroups(42)).toThrow('MAAS_OWNER_GROUPS');
  });
});

describe('formatMaaSOwnerGroups', () => {
  it('formats the groups as a list of name entries', () => {
    assert(formatMaaSOwnerGroups(['rhods-admins', 'rhods-users'])).toBe(
      '[{"name":"rhods-admins"},{"name":"rhods-users"}]',
    );
  });
});

describe('getOwnerGroupsReplacements', () => {
  const withPlaceholder = 'groups: {{OWNER_GROUPS}}';

  it('fills OWNER_GROUPS from the setting when the fixture has the placeholder', () => {
    assert(getOwnerGroupsReplacements(withPlaceholder, {}, ['grid-users'])).toEqual({
      OWNER_GROUPS: '[{"name":"grid-users"}]',
    });
  });

  it('uses the defaults when the setting is unset', () => {
    assert(getOwnerGroupsReplacements('groups: { { OWNER_GROUPS } }', {}, undefined)).toEqual({
      OWNER_GROUPS: '[{"name":"rhods-admins"},{"name":"rhods-users"}]',
    });
  });

  it('rejects an explicitly empty setting when the fixture has the placeholder', () => {
    assert(() => getOwnerGroupsReplacements(withPlaceholder, {}, [])).toThrow(
      'MAAS_OWNER_GROUPS is set but names no group',
    );
  });

  it.each([42, '', []])(
    'does not read the setting %p for a fixture without the placeholder',
    (setting) => {
      assert(getOwnerGroupsReplacements('groups: {{USER_GROUPS}}', {}, setting)).toEqual({});
    },
  );

  it.each([42, ''])(
    'does not read the setting %p when the caller passes OWNER_GROUPS',
    (setting) => {
      assert(getOwnerGroupsReplacements(withPlaceholder, { OWNER_GROUPS: '[]' }, setting)).toEqual(
        {},
      );
    },
  );
});

describe('default MaaS fixtures with OWNER_GROUPS', () => {
  const fill = (fixture: string, setting: unknown) => {
    const yamlContent = readFixture(fixture);
    return YAML.parse(
      replacePlaceholdersInYaml(yamlContent, {
        SUBSCRIPTION_NAME: 'sub',
        SUBSCRIPTION_DESCRIPTION: 'description',
        POLICY_NAME: 'policy',
        MODEL_NAME: 'model',
        PROJECT_NAME: 'project',
        ...getOwnerGroupsReplacements(yamlContent, {}, setting),
      }),
    );
  };

  it('renders the default owners in MaaSSubscription.yaml', () => {
    assert(fill('MaaSSubscription.yaml', undefined).spec.owner.groups).toEqual([
      { name: 'rhods-admins' },
      { name: 'rhods-users' },
    ]);
  });

  it('renders configured owners in MaaSAuthPolicy.yaml', () => {
    assert(fill('MaaSAuthPolicy.yaml', ['grid-users']).spec.subjects.groups).toEqual([
      { name: 'grid-users' },
    ]);
  });

  it.each(['system:authenticated', 'a"b', "it's", '#x', 'grid users', 'a$&b', "$'", 'ünïcode'])(
    'keeps the group name %p literally',
    (name) => {
      assert(fill('MaaSSubscription.yaml', [name]).spec.owner.groups).toEqual([{ name }]);
      assert(fill('MaaSAuthPolicy.yaml', [name]).spec.subjects.groups).toEqual([{ name }]);
    },
  );
});
