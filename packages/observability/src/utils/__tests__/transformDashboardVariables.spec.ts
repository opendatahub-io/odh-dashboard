import type { DashboardResource, ListVariableDefinition } from '@perses-dev/core';
import { NAMESPACE_URL_PARAM } from '../dashboardUtils';
import { transformNamespaceVariable } from '../transformDashboardVariables';

// Helper to create a mock dashboard with namespace variable
const createMockDashboardWithNamespaceVariable = (
  defaultValue?: string | string[],
): DashboardResource =>
  ({
    kind: 'Dashboard',
    metadata: { name: 'test-dashboard', project: 'test-project' },
    spec: {
      display: { name: 'Test Dashboard' },
      variables: [
        {
          kind: 'ListVariable',
          spec: {
            name: 'namespace',
            defaultValue,
            allowMultiple: true,
            allowAllValue: true,
            // Simulate OOTB wildcard All — transform must strip this for scoped queryParams
            customAllValue: '.*',
            plugin: {
              kind: 'PrometheusLabelValuesVariable',
              spec: {
                labelName: 'namespace',
              },
            },
          },
        } as ListVariableDefinition,
        {
          kind: 'TextVariable',
          spec: {
            name: 'other_variable',
            value: 'test-value',
          },
        },
      ],
    },
  } as DashboardResource);

// Helper to create a mock dashboard without variables (empty array)
const createMockDashboardWithoutVariables = (): DashboardResource =>
  ({
    kind: 'Dashboard',
    metadata: { name: 'test-dashboard', project: 'test-project' },
    spec: {
      display: { name: 'Test Dashboard' },
      variables: [],
    },
  } as unknown as DashboardResource);

// Helper to create a mock dashboard with empty variables array (alias for clarity)
const createMockDashboardWithEmptyVariables = createMockDashboardWithoutVariables;

// Helper to create a mock dashboard with non-namespace variables only
const createMockDashboardWithOtherVariables = (): DashboardResource =>
  ({
    kind: 'Dashboard',
    metadata: { name: 'test-dashboard', project: 'test-project' },
    spec: {
      display: { name: 'Test Dashboard' },
      variables: [
        {
          kind: 'TextVariable',
          spec: {
            name: 'cluster',
            value: 'default-cluster',
          },
        },
        {
          kind: 'ListVariable',
          spec: {
            name: 'environment',
            defaultValue: 'prod',
            plugin: {
              kind: 'StaticListVariable',
              spec: {
                values: [
                  { label: 'Production', value: 'prod' },
                  { label: 'Development', value: 'dev' },
                ],
              },
            },
          },
        },
      ],
    },
  } as DashboardResource);

describe('NAMESPACE_URL_PARAM', () => {
  it('should be defined as expected constant', () => {
    expect(NAMESPACE_URL_PARAM).toBe('var-namespace');
  });
});

describe('transformNamespaceVariable', () => {
  describe('when project names are empty', () => {
    it('should return the dashboard unchanged', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();

      const result = transformNamespaceVariable(dashboard, []);

      expect(result).toBe(dashboard);
    });
  });

  describe('when dashboard has no variables', () => {
    it('should return the dashboard unchanged', () => {
      const dashboard = createMockDashboardWithoutVariables();
      const projectNames = ['project-1', 'project-2'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      expect(result).toBe(dashboard);
    });
  });

  describe('when dashboard has empty variables array', () => {
    it('should return the dashboard unchanged', () => {
      const dashboard = createMockDashboardWithEmptyVariables();
      const projectNames = ['project-1', 'project-2'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      expect(result).toBe(dashboard);
    });
  });

  describe('when dashboard has no namespace variable', () => {
    it('should return a new dashboard with other variables unchanged', () => {
      const dashboard = createMockDashboardWithOtherVariables();
      const projectNames = ['project-1', 'project-2'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      // Should create new object but variables should be the same (no transformation)
      expect(result).not.toBe(dashboard);
      expect(result.spec.variables).toHaveLength(2);
      expect(result.spec.variables[0]).toEqual(dashboard.spec.variables[0]);
      expect(result.spec.variables[1]).toEqual(dashboard.spec.variables[1]);
    });
  });

  describe('when dashboard has namespace variable', () => {
    it('should transform namespace variable to StaticListVariable', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();
      const projectNames = ['project-alpha', 'project-beta'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      // Should create new dashboard object
      expect(result).not.toBe(dashboard);

      // Find the transformed namespace variable
      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        expect(namespaceVar.spec.plugin.kind).toBe('StaticListVariable');
        expect(namespaceVar.spec.plugin.spec).toEqual({
          values: [
            { label: 'project-alpha', value: 'project-alpha' },
            { label: 'project-beta', value: 'project-beta' },
          ],
        });
      }
    });

    it('should omit customAllValue so All expands to the concrete project list', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();
      const projectNames = ['project-alpha', 'project-beta', 'project-gamma'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        // Wildcard/regex All breaks scoped ${namespace:queryparam} (namespace=.*)
        expect(namespaceVar.spec.customAllValue).toBeUndefined();
        // Preserve dashboard allowAllValue; do not force it on.
        expect(namespaceVar.spec.allowAllValue).toBe(true);
        expect(namespaceVar.spec.plugin.spec).toEqual({
          values: [
            { label: 'project-alpha', value: 'project-alpha' },
            { label: 'project-beta', value: 'project-beta' },
            { label: 'project-gamma', value: 'project-gamma' },
          ],
        });
      }
    });

    it('should preserve allowAllValue false from the dashboard', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();
      const nsVar = dashboard.spec.variables[0] as ListVariableDefinition;
      nsVar.spec.allowAllValue = false;

      const result = transformNamespaceVariable(dashboard, ['project-1']);
      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar?.spec.allowAllValue).toBe(false);
      expect(namespaceVar?.spec.customAllValue).toBeUndefined();
    });

    it('should fall back to the first project when allowAllValue is false and defaults are unset', () => {
      const dashboard = createMockDashboardWithNamespaceVariable(undefined);
      const nsVar = dashboard.spec.variables[0] as ListVariableDefinition;
      nsVar.spec.allowAllValue = false;

      const result = transformNamespaceVariable(dashboard, ['project-1', 'project-2']);
      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar?.spec.defaultValue).toBe('project-1');
    });

    it('should fall back to the first project when allowAllValue is omitted and defaults are unset', () => {
      const dashboard = createMockDashboardWithNamespaceVariable(undefined);
      const nsVar = dashboard.spec.variables[0] as ListVariableDefinition;
      delete (nsVar.spec as { allowAllValue?: boolean }).allowAllValue;

      const result = transformNamespaceVariable(dashboard, ['project-alpha', 'project-beta']);
      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar?.spec.defaultValue).toBe('project-alpha');
    });

    it('should leave customAllValue undefined when the dashboard already omits it', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();
      const nsVar = dashboard.spec.variables[0] as ListVariableDefinition;
      delete nsVar.spec.customAllValue;

      const result = transformNamespaceVariable(dashboard, ['project-1', 'project-2']);
      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar?.spec.customAllValue).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(namespaceVar?.spec ?? {}, 'customAllValue')).toBe(
        false,
      );
    });

    it('must not reintroduce pipe-regex customAllValue for Project=All', () => {
      // Regression: old transform set customAllValue to "(a|b)" which breaks
      // scoped queryParams (proxy gets namespace=(a|b) / Bad Request).
      const dashboard = createMockDashboardWithNamespaceVariable();
      const projectNames = ['project-alpha', 'project-beta'];

      const result = transformNamespaceVariable(dashboard, projectNames);
      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar?.spec.customAllValue).toBeUndefined();
      expect(namespaceVar?.spec.customAllValue).not.toBe('(project-alpha|project-beta)');
      expect(JSON.stringify(namespaceVar?.spec)).not.toMatch(/customAllValue/);
    });

    it('should preserve other variable properties when transforming', () => {
      const dashboard = createMockDashboardWithNamespaceVariable('$__all');
      const projectNames = ['project-1'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        expect(namespaceVar.spec.name).toBe('namespace');
        expect(namespaceVar.spec.allowMultiple).toBe(true);
        expect(namespaceVar.spec.allowAllValue).toBe(true);
      }
    });

    it('should not modify other variables in the dashboard', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();
      const projectNames = ['project-1'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      const otherVar = result.spec.variables.find((v) => v.kind === 'TextVariable');

      expect(otherVar).toEqual({
        kind: 'TextVariable',
        spec: {
          name: 'other_variable',
          value: 'test-value',
        },
      });
    });
  });

  describe('with initial namespace value', () => {
    it('should set string initial value as defaultValue', () => {
      const dashboard = createMockDashboardWithNamespaceVariable('$__all');
      const projectNames = ['project-1', 'project-2'];
      const initialValue = 'project-1';

      const result = transformNamespaceVariable(dashboard, projectNames, initialValue);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        expect(namespaceVar.spec.defaultValue).toBe('project-1');
      }
    });

    it('should set array initial value as defaultValue', () => {
      const dashboard = createMockDashboardWithNamespaceVariable('$__all');
      const projectNames = ['project-1', 'project-2', 'project-3'];
      const initialValue = ['project-1', 'project-2'];

      const result = transformNamespaceVariable(dashboard, projectNames, initialValue);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        expect(namespaceVar.spec.defaultValue).toEqual(['project-1', 'project-2']);
      }
    });

    it('should preserve original defaultValue when initialValue is not provided', () => {
      const dashboard = createMockDashboardWithNamespaceVariable('$__all');
      const projectNames = ['project-1'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        expect(namespaceVar.spec.defaultValue).toBe('$__all');
      }
    });

    it('should use $__all as defaultValue when both original and initial are undefined', () => {
      const dashboard = createMockDashboardWithNamespaceVariable(undefined);
      const projectNames = ['project-1'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        expect(namespaceVar.spec.defaultValue).toBe('$__all');
      }
    });
  });

  describe('immutability', () => {
    it('should not mutate the original dashboard and return new objects', () => {
      const dashboard = createMockDashboardWithNamespaceVariable('$__all');
      const originalJson = JSON.stringify(dashboard);
      const projectNames = ['project-1', 'project-2'];

      const result = transformNamespaceVariable(dashboard, projectNames, 'project-1');

      // Original should be unchanged
      expect(JSON.stringify(dashboard)).toBe(originalJson);
      // Result should be new objects
      expect(result).not.toBe(dashboard);
      expect(result.spec).not.toBe(dashboard.spec);
      expect(result.spec.variables).not.toBe(dashboard.spec.variables);
    });
  });

  describe('edge cases', () => {
    it('should handle many project names', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();
      const projectNames = Array.from({ length: 100 }, (_, i) => `project-${i}`);

      const result = transformNamespaceVariable(dashboard, projectNames);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        const values = namespaceVar.spec.plugin.spec as {
          values: { label: string; value: string }[];
        };
        expect(values.values).toHaveLength(100);
        expect(values.values[0]).toEqual({
          label: 'project-0',
          value: 'project-0',
        });
        expect(values.values[99]).toEqual({
          label: 'project-99',
          value: 'project-99',
        });
      }
    });

    it('should handle project names with special characters', () => {
      const dashboard = createMockDashboardWithNamespaceVariable();
      const projectNames = ['my-project', 'project_name', 'project.with.dots'];

      const result = transformNamespaceVariable(dashboard, projectNames);

      const namespaceVar = result.spec.variables.find(
        (v) => v.kind === 'ListVariable' && v.spec.name === 'namespace',
      ) as ListVariableDefinition | undefined;

      expect(namespaceVar).toBeDefined();
      if (namespaceVar) {
        const values = namespaceVar.spec.plugin.spec as {
          values: { label: string; value: string }[];
        };
        expect(values.values).toEqual([
          { label: 'my-project', value: 'my-project' },
          { label: 'project_name', value: 'project_name' },
          { label: 'project.with.dots', value: 'project.with.dots' },
        ]);
      }
    });
  });
});
