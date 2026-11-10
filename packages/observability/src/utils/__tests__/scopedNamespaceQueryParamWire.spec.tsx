import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { DashboardResource, ListVariableDefinition } from '@perses-dev/core';
import { PrometheusLabelValuesVariable } from '@perses-dev/prometheus-plugin/lib/plugins/PrometheusLabelValuesVariable';
import {
  TimeRangeProviderBasic,
  useAllVariableValues,
  type DatasourceStore,
  type VariableStateMap,
} from '@perses-dev/plugin-system';
import { interpolateQueryParams } from '@perses-dev/components';
import { useVariableDefinitionActions, VariableProvider } from '@perses-dev/dashboards';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { transformNamespaceVariable } from '../transformDashboardVariables';

const DS_NAMESPACE_QUERY_PARAMS = {
  namespace: '${namespace:queryparam}',
} as const;

const createModelsStyleDashboard = (): DashboardResource =>
  ({
    kind: 'Dashboard',
    metadata: { name: 'dashboard-1-model', project: 'opendatahub' },
    spec: {
      display: { name: 'Models' },
      variables: [
        {
          kind: 'TextVariable',
          spec: { name: 'namespace', value: '' },
        },
        {
          kind: 'ListVariable',
          spec: {
            name: 'model_name',
            allowMultiple: true,
            allowAllValue: true,
            customAllValue: '.*',
            defaultValue: '$__all',
            plugin: {
              kind: 'PrometheusLabelValuesVariable',
              spec: {
                datasource: {
                  kind: 'PrometheusDatasource',
                  name: 'data-science-prometheus-datasource',
                },
                labelName: 'model_name',
                matchers: ['vllm:num_requests_running'],
              },
            },
          },
        },
      ],
    },
  } as DashboardResource);

const createDatasourceSpec = () => ({
  plugin: {
    kind: 'PrometheusDatasource',
    spec: {
      queryParams: DS_NAMESPACE_QUERY_PARAMS,
    },
  },
});

const fetchModelNameOptions = (
  variables: VariableStateMap,
  datasourceStore: DatasourceStore,
): Promise<unknown> =>
  PrometheusLabelValuesVariable.getVariableOptions(
    {
      datasource: {
        kind: 'PrometheusDatasource',
        name: 'data-science-prometheus-datasource',
      },
      labelName: 'model_name',
      matchers: ['vllm:num_requests_running'],
    },
    {
      variables,
      timeRange: { start: new Date(0), end: new Date(60 * 60 * 1000) },
      datasourceStore,
    },
  );

type VariableStateProbeProps = {
  namespaceOptions: { label: string; value: string }[];
  onState: (state: VariableStateMap) => void;
  onSetValue: (setValue: (name: string, value: string | string[]) => void) => void;
};

const VariableStateProbe: React.FC<VariableStateProbeProps> = ({
  namespaceOptions,
  onState,
  onSetValue,
}) => {
  const state = useAllVariableValues();
  const { setVariableOptions, setVariableValue } = useVariableDefinitionActions();

  React.useEffect(() => {
    setVariableOptions('namespace', namespaceOptions);
  }, [namespaceOptions, setVariableOptions]);

  React.useEffect(() => {
    onState(state);
    onSetValue((name, value) => setVariableValue(name, value));
  }, [onSetValue, onState, setVariableValue, state]);

  return null;
};

const renderPersesVariableState = async (
  definition: ListVariableDefinition,
  namespaceOptions: { label: string; value: string }[],
) => {
  let latestState: VariableStateMap | undefined;
  let setVariableValue: ((name: string, value: string | string[]) => void) | undefined;
  const queryClient = new QueryClient();

  const view = render(
    <QueryClientProvider client={queryClient}>
      <TimeRangeProviderBasic
        initialTimeRange={{ pastDuration: '1h' }}
        initialRefreshInterval="60s"
      >
        <VariableProvider initialVariableDefinitions={[definition]}>
          <VariableStateProbe
            namespaceOptions={namespaceOptions}
            onState={(state) => {
              latestState = state;
            }}
            onSetValue={(setValue) => {
              setVariableValue = setValue;
            }}
          />
        </VariableProvider>
      </TimeRangeProviderBasic>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(latestState?.namespace.value).toEqual(namespaceOptions.map(({ value }) => value));
  });

  return {
    view,
    getState: () => latestState as VariableStateMap,
    setVariableValue: (name: string, value: string | string[]) => {
      if (!setVariableValue) {
        throw new Error('Perses variable actions were not initialized');
      }
      act(() => setVariableValue?.(name, value));
    },
  };
};

describe('scoped namespace queryparam wire', () => {
  const projects = ['project-a', 'project-b', 'project-c'];
  const namespaceOptions = projects.map((value) => ({ label: value, value }));

  it('should transform Project=All to concrete namespace options without a wildcard', () => {
    const result = transformNamespaceVariable(createModelsStyleDashboard(), projects);
    const namespaceVar = result.spec.variables.find(
      (variable) => variable.kind === 'ListVariable' && variable.spec.name === 'namespace',
    ) as ListVariableDefinition | undefined;

    expect(namespaceVar?.spec.allowAllValue).toBe(true);
    expect(namespaceVar?.spec.customAllValue).toBeUndefined();
    expect(namespaceVar?.spec.defaultValue).toBe('$__all');
    expect(namespaceVar?.spec.plugin.spec).toEqual({
      values: namespaceOptions,
    });
  });

  it('should emit concrete namespaces for panel and model-name requests from Perses All state', async () => {
    const transformed = transformNamespaceVariable(createModelsStyleDashboard(), projects);
    const namespaceDefinition = transformed.spec.variables.find(
      (variable) => variable.kind === 'ListVariable' && variable.spec.name === 'namespace',
    ) as ListVariableDefinition;
    const perses = await renderPersesVariableState(namespaceDefinition, namespaceOptions);
    const datasourceSpec = createDatasourceSpec();
    const labelValues = jest.fn().mockResolvedValue({ data: [] });
    const datasourceStore = {
      getDatasourceClient: jest.fn().mockResolvedValue({ labelValues }),
      getDatasource: jest.fn().mockResolvedValue(datasourceSpec),
      listDatasourceSelectItems: jest.fn().mockResolvedValue([]),
    } as unknown as DatasourceStore;

    await fetchModelNameOptions(perses.getState(), datasourceStore);

    expect(interpolateQueryParams(DS_NAMESPACE_QUERY_PARAMS, perses.getState()).namespace).toEqual(
      projects,
    );
    expect(labelValues).toHaveBeenCalledWith(
      expect.objectContaining({
        labelName: 'model_name',
        'match[]': ['vllm:num_requests_running'],
      }),
      expect.objectContaining({ queryParams: { namespace: projects } }),
    );

    perses.setVariableValue('namespace', ['project-a', 'project-c']);
    await waitFor(() => {
      expect(perses.getState().namespace.value).toEqual(['project-a', 'project-c']);
    });

    expect(interpolateQueryParams(DS_NAMESPACE_QUERY_PARAMS, perses.getState()).namespace).toEqual([
      'project-a',
      'project-c',
    ]);

    await fetchModelNameOptions(perses.getState(), datasourceStore);

    expect(labelValues).toHaveBeenLastCalledWith(
      expect.objectContaining({
        labelName: 'model_name',
        'match[]': ['vllm:num_requests_running'],
      }),
      expect.objectContaining({ queryParams: { namespace: ['project-a', 'project-c'] } }),
    );

    perses.view.unmount();
  });
});
