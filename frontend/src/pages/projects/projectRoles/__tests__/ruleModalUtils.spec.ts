import { SelectionOptions } from '#~/components/MultiSelection';
import {
  CORE_GROUP_ID,
  extractApiGroups,
  extractResources,
  normalizeVerbs,
} from '#~/pages/projects/projectRoles/ruleModalUtils';

describe('extractApiGroups', () => {
  it('should map selection IDs to API group strings', () => {
    const selections: SelectionOptions[] = [
      { id: 'apps', name: 'apps', selected: true },
      { id: 'batch', name: 'batch', selected: true },
    ];
    expect(extractApiGroups(selections)).toEqual(['apps', 'batch']);
  });

  it('should map CORE_GROUP_ID back to empty string', () => {
    const selections: SelectionOptions[] = [{ id: CORE_GROUP_ID, name: 'core', selected: true }];
    expect(extractApiGroups(selections)).toEqual(['']);
  });

  it('should handle mixed core and named groups', () => {
    const selections: SelectionOptions[] = [
      { id: CORE_GROUP_ID, name: 'core', selected: true },
      { id: 'rbac.authorization.k8s.io', name: 'rbac.authorization.k8s.io', selected: true },
    ];
    expect(extractApiGroups(selections)).toEqual(['', 'rbac.authorization.k8s.io']);
  });

  it('should return empty array for no selections', () => {
    expect(extractApiGroups([])).toEqual([]);
  });

  it('should handle numeric IDs by converting to string', () => {
    const selections: SelectionOptions[] = [{ id: 123, name: 'test', selected: true }];
    expect(extractApiGroups(selections)).toEqual(['123']);
  });
});

describe('extractResources', () => {
  it('should strip API group prefix from resource IDs', () => {
    const selections: SelectionOptions[] = [
      { id: 'apps/deployments', name: 'deployments', selected: true },
      { id: 'batch/jobs', name: 'jobs', selected: true },
    ];
    expect(extractResources(selections)).toEqual(['deployments', 'jobs']);
  });

  it('should handle core group resources with empty prefix', () => {
    const selections: SelectionOptions[] = [
      { id: '/configmaps', name: 'configmaps', selected: true },
    ];
    expect(extractResources(selections)).toEqual(['configmaps']);
  });

  it('should return plain ID when no slash is present (custom resources)', () => {
    const selections: SelectionOptions[] = [
      { id: 'my-custom-resource', name: 'my-custom-resource', selected: true },
    ];
    expect(extractResources(selections)).toEqual(['my-custom-resource']);
  });

  it('should handle wildcard resource', () => {
    const selections: SelectionOptions[] = [{ id: '*', name: '*', selected: true }];
    expect(extractResources(selections)).toEqual(['*']);
  });

  it('should return empty array for no selections', () => {
    expect(extractResources([])).toEqual([]);
  });

  it('should handle resources with nested subresources in API group', () => {
    const selections: SelectionOptions[] = [
      { id: 'apps.openshift.io/deploymentconfigs', name: 'deploymentconfigs', selected: true },
    ];
    expect(extractResources(selections)).toEqual(['deploymentconfigs']);
  });
});

describe('normalizeVerbs', () => {
  it('should return individual verbs when wildcard is not present', () => {
    const verbs = ['get', 'list', 'watch'];
    expect(normalizeVerbs(verbs)).toEqual(['get', 'list', 'watch']);
  });

  it('should collapse to wildcard when wildcard is present', () => {
    const verbs = ['*', 'get', 'list'];
    expect(normalizeVerbs(verbs)).toEqual(['*']);
  });

  it('should return wildcard alone when only wildcard is selected', () => {
    expect(normalizeVerbs(['*'])).toEqual(['*']);
  });

  it('should return empty array for no verbs', () => {
    expect(normalizeVerbs([])).toEqual([]);
  });

  it('should return a copy, not the same reference', () => {
    const verbs = ['get', 'list'];
    const result = normalizeVerbs(verbs);
    expect(result).toEqual(verbs);
    expect(result).not.toBe(verbs);
  });
});
