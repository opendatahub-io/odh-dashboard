import React, { useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useSearchParams } from 'react-router-dom';
import { find, findLast } from 'lodash-es';

import Select from 'react-select';
import { Button, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import { CompareRunsSearchParam } from '#~/routes/experiments/registryBase.ts';
import useExperimentRunsArtifactsMetrics from '#~/concepts/modelRegistry/apiHooks/useExperimentRunsArtifactsMetrics';
import {
  transformDataToDimensions,
  getColorScaleConfigsForDimension,
  getUniqueParameterNames,
  Option,
  filterMockDataByParameters,
} from './utils';

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

  const paramsNames = React.useMemo(
    () => getUniqueParameterNames(runsData, 'parameter'),
    [runsData],
  );
  const metricsNames = React.useMemo(() => getUniqueParameterNames(runsData, 'metric'), [runsData]);

  const paramOptions: Option[] = paramsNames.map((n) => ({ label: n, value: n }));
  const metricOptions: Option[] = metricsNames.map((n) => ({ label: n, value: n }));

  const [selectedParams, setSelectedParams] = React.useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);

  const [filteredData, setFilteredData] = React.useState<any[]>([]);

  const isEmpty = selectedParams.length === 0 && selectedMetrics.length === 0;

  useEffect(() => {
    const includeNames = [...selectedParams, ...selectedMetrics];
    if (isEmpty) {
      setFilteredData([]);
    } else {
      const newData = filterMockDataByParameters(runsData, {
        parameterNames: includeNames,
        includeMetrics: true,
        includeModelArtifacts: false,
      });
      setFilteredData(newData);
    }
  }, [selectedParams, selectedMetrics, runsData, isEmpty]);

  const dimensions = React.useMemo(() => transformDataToDimensions(filteredData), [filteredData]);

  const lastMetricDimensionMetricKey = findLast(
    filteredData[0]?.items,
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
      <>
        <h3>Parallel Coordinates Plot Data</h3>
        <Split hasGutter>
          <SplitItem isFilled>
            <Stack hasGutter>
              <StackItem>
                <Select
                  isMulti
                  name="parameters"
                  options={paramOptions}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  placeholder="Please select parameters"
                  value={paramOptions.filter((o) => selectedParams.includes(o.value))}
                  onChange={(options) =>
                    setSelectedParams(Array.isArray(options) ? options.map((o) => o.value) : [])
                  }
                />
              </StackItem>
              <StackItem>
                <Select
                  isMulti
                  name="metrics"
                  options={metricOptions}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  placeholder="Please select metrics"
                  value={metricOptions.filter((o) => selectedMetrics.includes(o.value))}
                  onChange={(options) =>
                    setSelectedMetrics(Array.isArray(options) ? options.map((o) => o.value) : [])
                  }
                />
              </StackItem>
              <StackItem>
                <Button
                  onClick={() => {
                    setSelectedParams([]);
                    setSelectedMetrics([]);
                    setFilteredData([]);
                  }}
                >
                  Clear parameters
                </Button>
              </StackItem>
            </Stack>
          </SplitItem>
          <SplitItem isFilled>
            {!isEmpty ? (
              <Plot
                data={[
                  {
                    type: 'parcoords',
                    ...(lastMetricDimensionMetricKey && {
                      line: getColorScaleConfigsForDimension(
                        find(dimensions, ['label', lastMetricDimensionMetricKey]),
                      ),
                    }),
                    dimensions,
                  },
                ]}
                layout={{ autosize: true, margin: { t: 50 } }}
              />
            ) : (
              <div>Nothing to see</div>
            )}
          </SplitItem>
        </Split>
      </>
    </ApplicationsPage>
  );
};

export default CompareRuns;
