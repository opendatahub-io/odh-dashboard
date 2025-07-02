import React from 'react';
import Plot from 'react-plotly.js';
import { useSearchParams } from 'react-router-dom';
import { find, findLast } from 'lodash-es';

import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import { CompareRunsSearchParam } from '#~/routes/experiments/registryBase.ts';
import useExperimentRunsArtifactsMetrics from '#~/concepts/modelRegistry/apiHooks/useExperimentRunsArtifactsMetrics';
import { transformMockDataToDimensions, getColorScaleConfigsForDimension } from './utils';

type CompareRunsProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const CompareRuns: React.FC<CompareRunsProps> = ({ ...pageProps }) => {
  // get runs from query params
  const [searchParams] = useSearchParams();
  const runs = searchParams.get(CompareRunsSearchParam.RUNS);

  // Memoize the split operation to prevent unnecessary re-renders
  const runIds = React.useMemo(() => (runs ? runs.split(',').filter(Boolean) : []), [runs]);

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
