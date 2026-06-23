import { KnownLabels } from '@odh-dashboard/k8s-core';
import assembleRole from '#~/pages/projects/projectRoles/assembleRole';
import type { RuleEntry } from '#~/pages/projects/projectRoles/types';

describe('assembleRole', () => {
  it('should build a basic role with no rules', () => {
    const result = assembleRole('test-ns', 'my-role', 'My Role', '', []);

    expect(result).toStrictEqual({
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'Role',
      metadata: {
        name: 'my-role',
        namespace: 'test-ns',
        labels: {
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        },
        annotations: {
          'openshift.io/display-name': 'My Role',
        },
      },
      rules: [],
    });
  });

  it('should include description annotation when provided', () => {
    const result = assembleRole('test-ns', 'my-role', 'My Role', 'A test role', []);

    expect(result.metadata.annotations).toStrictEqual({
      'openshift.io/display-name': 'My Role',
      'openshift.io/description': 'A test role',
    });
  });

  it('should omit description annotation when empty', () => {
    const result = assembleRole('test-ns', 'my-role', 'My Role', '', []);

    expect(result.metadata.annotations).toStrictEqual({
      'openshift.io/display-name': 'My Role',
    });
  });

  it('should strip id field from rules', () => {
    const rules: RuleEntry[] = [
      {
        id: 'rule-1',
        verbs: ['get', 'list'],
        apiGroups: [''],
        resources: ['pods'],
      },
      {
        id: 'rule-2',
        verbs: ['create'],
        apiGroups: ['apps'],
        resources: ['deployments'],
        resourceNames: ['my-deployment'],
      },
    ];

    const result = assembleRole('test-ns', 'my-role', 'My Role', '', rules);

    expect(result.rules).toStrictEqual([
      {
        verbs: ['get', 'list'],
        apiGroups: [''],
        resources: ['pods'],
      },
      {
        verbs: ['create'],
        apiGroups: ['apps'],
        resources: ['deployments'],
        resourceNames: ['my-deployment'],
      },
    ]);
  });

  it('should always include dashboard resource label', () => {
    const result = assembleRole('ns', 'r', 'R', '', []);

    expect(result.metadata.labels).toStrictEqual({
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    });
  });

  it('should omit optional fields when undefined', () => {
    const rules: RuleEntry[] = [
      {
        id: 'rule-1',
        verbs: ['get'],
      },
    ];

    const result = assembleRole('ns', 'r', 'R', '', rules);

    expect(result.rules[0]).toStrictEqual({ verbs: ['get'] });
    expect(result.rules[0]).not.toHaveProperty('apiGroups');
    expect(result.rules[0]).not.toHaveProperty('resources');
    expect(result.rules[0]).not.toHaveProperty('resourceNames');
  });

  it('should merge user labels with dashboard resource label', () => {
    const userLabels = { 'app.kubernetes.io/name': 'my-app', team: 'platform' };
    const result = assembleRole('ns', 'r', 'R', '', [], userLabels);

    expect(result.metadata.labels).toStrictEqual({
      'app.kubernetes.io/name': 'my-app',
      team: 'platform',
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    });
  });

  it('should ensure dashboard resource label overrides user label', () => {
    const userLabels = { [KnownLabels.DASHBOARD_RESOURCE]: 'false' };
    const result = assembleRole('ns', 'r', 'R', '', [], userLabels);

    expect(result.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE]).toBe('true');
  });
});
