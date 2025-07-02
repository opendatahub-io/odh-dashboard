import React from 'react';
import Plot from 'react-plotly.js';
import { useSearchParams } from 'react-router-dom';
import { min, max, findLast, find } from 'lodash-es';

import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import { CompareRunsSearchParam } from '#~/routes/experiments/registryBase.ts';
import useExperimentRunsArtifactsMetrics from '#~/concepts/modelRegistry/apiHooks/useExperimentRunsArtifactsMetrics';

type CompareRunsProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const mockdata = [
  {
    items: [
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389364285',
        customProperties: {},
        id: '3',
        lastUpdateTimeSinceEpoch: '1751389364285',
        name: 'solver',
        parameterType: 'string',
        value: 'lbfgs',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389364445',
        customProperties: {},
        id: '4',
        lastUpdateTimeSinceEpoch: '1751389364445',
        name: 'max_iter',
        parameterType: 'string',
        value: '1000',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389364587',
        customProperties: {},
        id: '5',
        lastUpdateTimeSinceEpoch: '1751389364587',
        name: 'multi_class',
        parameterType: 'string',
        value: 'auto',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389364710',
        customProperties: {},
        id: '6',
        lastUpdateTimeSinceEpoch: '1751389364710',
        name: 'random_state',
        parameterType: 'string',
        value: '8888',
      },
      {
        artifactType: 'metric',
        createTimeSinceEpoch: '1751389364996',
        customProperties: {},
        id: '7',
        lastUpdateTimeSinceEpoch: '1751389365981',
        name: 'accuracy',
        step: 0,
        timestamp: '1751389364858',
        value: 1,
      },
      {
        artifactType: 'model-artifact',
        createTimeSinceEpoch: '1751389365332',
        customProperties: {
          'mlflow.source.git.commit': {
            metadataType: 'MetadataStringValue',
            string_value: 'a0e0bbdaaefb5ab91fb95dc8d580648af6f86743',
          },
          'mlflow.source.name': {
            metadataType: 'MetadataStringValue',
            string_value: 'quickstart.py',
          },
          'mlflow.source.type': {
            metadataType: 'MetadataStringValue',
            string_value: 'LOCAL',
          },
          'mlflow.user': {
            metadataType: 'MetadataStringValue',
            string_value: 'hukhan',
          },
          mlflow__artifact_location: {
            metadataType: 'MetadataStringValue',
            string_value:
              'file:///home/hukhan/projects/playground/playground_pycharm/mlmd-tracking/mr-tracking-quickstart/mlruns/experiments/9/10/iris_model',
          },
          mlflow__description: {
            metadataType: 'MetadataStringValue',
            string_value: 'MLflow logged model: iris_model',
          },
          mlflow__experiment_id: {
            metadataType: 'MetadataStringValue',
            string_value: '9',
          },
          mlflow__model_io_type: {
            metadataType: 'MetadataStringValue',
            string_value: 'output',
          },
          mlflow__model_type: {
            metadataType: 'MetadataStringValue',
            string_value: 'unknown',
          },
          mlflow__name: {
            metadataType: 'MetadataStringValue',
            string_value: 'iris_model',
          },
          mlflow__source_run_id: {
            metadataType: 'MetadataStringValue',
            string_value: '10',
          },
          mlflow__status_message: {
            metadataType: 'MetadataStringValue',
            string_value: '',
          },
          mlflow__user_id: {
            metadataType: 'MetadataStringValue',
            string_value: 'unknown',
          },
          mlflow__version: {
            metadataType: 'MetadataStringValue',
            string_value: '1',
          },
          param_max_iter: {
            metadataType: 'MetadataStringValue',
            string_value: '1000',
          },
          param_multi_class: {
            metadataType: 'MetadataStringValue',
            string_value: 'auto',
          },
          param_random_state: {
            metadataType: 'MetadataStringValue',
            string_value: '8888',
          },
          param_solver: {
            metadataType: 'MetadataStringValue',
            string_value: 'lbfgs',
          },
        },
        description: 'MLflow logged model: iris_model',
        id: '9',
        lastUpdateTimeSinceEpoch: '1751389369111',
        name: 'iris_model',
        state: 'LIVE',
        uri: 'file:///home/hukhan/projects/playground/playground_pycharm/mlmd-tracking/mr-tracking-quickstart/mlruns/experiments/9/10/iris_model',
      },
    ],
    nextPageToken: '',
    pageSize: 0,
    size: 6,
  },
  {
    items: [
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389796314',
        customProperties: {},
        id: '11',
        lastUpdateTimeSinceEpoch: '1751389796314',
        name: 'solver',
        parameterType: 'string',
        value: 'lbfgs',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389796434',
        customProperties: {},
        id: '12',
        lastUpdateTimeSinceEpoch: '1751389796434',
        name: 'max_iter',
        parameterType: 'string',
        value: '1000',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389796569',
        customProperties: {},
        id: '13',
        lastUpdateTimeSinceEpoch: '1751389796569',
        name: 'multi_class',
        parameterType: 'string',
        value: 'auto',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751389796715',
        customProperties: {},
        id: '14',
        lastUpdateTimeSinceEpoch: '1751389796715',
        name: 'random_state',
        parameterType: 'string',
        value: '8888',
      },
      {
        artifactType: 'metric',
        createTimeSinceEpoch: '1751389797046',
        customProperties: {},
        id: '15',
        lastUpdateTimeSinceEpoch: '1751389798063',
        name: 'accuracy',
        step: 0,
        timestamp: '1751389796878',
        value: 1,
      },
      {
        artifactType: 'model-artifact',
        createTimeSinceEpoch: '1751389797395',
        customProperties: {
          'mlflow.source.name': {
            metadataType: 'MetadataStringValue',
            string_value: 'f2f-tracking.py',
          },
          'mlflow.source.type': {
            metadataType: 'MetadataStringValue',
            string_value: 'LOCAL',
          },
          'mlflow.user': {
            metadataType: 'MetadataStringValue',
            string_value: 'asurti',
          },
          mlflow__artifact_location: {
            metadataType: 'MetadataStringValue',
            string_value:
              'file:///home/hukhan/projects/playground/playground_pycharm/mlmd-tracking/mr-tracking-quickstart/mlruns/experiments/9/11/iris_model',
          },
          mlflow__description: {
            metadataType: 'MetadataStringValue',
            string_value: 'MLflow logged model: iris_model',
          },
          mlflow__experiment_id: {
            metadataType: 'MetadataStringValue',
            string_value: '9',
          },
          mlflow__model_io_type: {
            metadataType: 'MetadataStringValue',
            string_value: 'output',
          },
          mlflow__model_type: {
            metadataType: 'MetadataStringValue',
            string_value: 'unknown',
          },
          mlflow__name: {
            metadataType: 'MetadataStringValue',
            string_value: 'iris_model',
          },
          mlflow__source_run_id: {
            metadataType: 'MetadataStringValue',
            string_value: '11',
          },
          mlflow__status_message: {
            metadataType: 'MetadataStringValue',
            string_value: '',
          },
          mlflow__user_id: {
            metadataType: 'MetadataStringValue',
            string_value: 'unknown',
          },
          mlflow__version: {
            metadataType: 'MetadataStringValue',
            string_value: '1',
          },
          param_max_iter: {
            metadataType: 'MetadataStringValue',
            string_value: '1000',
          },
          param_multi_class: {
            metadataType: 'MetadataStringValue',
            string_value: 'auto',
          },
          param_random_state: {
            metadataType: 'MetadataStringValue',
            string_value: '8888',
          },
          param_solver: {
            metadataType: 'MetadataStringValue',
            string_value: 'lbfgs',
          },
        },
        description: 'MLflow logged model: iris_model',
        id: '17',
        lastUpdateTimeSinceEpoch: '1751389800025',
        name: 'iris_model',
        state: 'ABANDONED',
        uri: 'file:///home/hukhan/projects/playground/playground_pycharm/mlmd-tracking/mr-tracking-quickstart/mlruns/experiments/9/11/iris_model',
      },
    ],
    nextPageToken: '',
    pageSize: 0,
    size: 6,
  },
];

// Transform mockdata into dimensions format for parallel coordinates plot
const transformMockDataToDimensions = (data: typeof mockdata) => {
  // Get all unique parameter/metric names
  const uniqueNames = new Set<string>();
  data.forEach((run) => {
    run.items.forEach((item) => {
      uniqueNames.add(item.name);
    });
  });

  // Create dimensions array
  return Array.from(uniqueNames).map((name) => {
    const values: number[] = [];

    data.forEach((run) => {
      const item = run.items.find((i) => i.name === name);
      if (item) {
        // For parameters, convert string value to number
        if (item.artifactType === 'parameter' && 'value' in item) {
          values.push(parseFloat(String(item.value)) || 0);
        }
        // For metrics, use the value directly
        else if (item.artifactType === 'metric' && 'value' in item) {
          values.push(Number(item.value));
        }
      } else {
        // If this run doesn't have this parameter/metric, use 0 or handle as needed
        values.push(0);
      }
    });

    return {
      label: name,
      values,
    };
  });
};

const getColorScaleConfigsForDimension = (dimension: any) => {
  if (!dimension) return null;
  const cmin = min(dimension.values);
  const cmax = max(dimension.values);
  return {
    showscale: true,
    colorscale: 'Jet',
    cmin,
    cmax,
    color: dimension.values,
  };
};

const CompareRuns: React.FC<CompareRunsProps> = ({ ...pageProps }) => {
  // get runs from query params
  const [searchParams] = useSearchParams();
  const runs = searchParams.get(CompareRunsSearchParam.RUNS);

  // Memoize the split operation to prevent unnecessary re-renders
  const runIds = React.useMemo(() => {
    return runs ? runs.split(',').filter(Boolean) : [];
  }, [runs]);

  const [runsData, loaded] = useExperimentRunsArtifactsMetrics(runIds);

  const transformedData = transformMockDataToDimensions(runsData);

  const lastMetricDimensionMetricKey = findLast(
    runsData[0]?.items,
    (item) => item.artifactType === 'metric',
  )?.name;

  return (
    <ApplicationsPage
      {...pageProps}
      title="Compare runs"
      description="Compare runs"
      loaded
      provideChildrenPadding
    >
      <div>
        <h3>Parallel Coordinates Plot Data</h3>
        <Plot
          data={[
            {
              type: 'parcoords',
              line: getColorScaleConfigsForDimension(
                find(transformedData, ['label', lastMetricDimensionMetricKey]),
              ),
              dimensions: transformedData,
            },
          ]}
          layout={{ autosize: true, margin: { t: 50 } }}
        />
      </div>
    </ApplicationsPage>
  );
};

export default CompareRuns;
