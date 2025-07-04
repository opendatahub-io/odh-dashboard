import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Title,
  Label,
  Spinner,
  Bullseye,
} from '@patternfly/react-core';
import {
  Chart,
  ChartAxis,
  ChartLine,
  ChartScatter,
  ChartGroup,
  ChartVoronoiContainer,
  ChartThemeColor,
} from '@patternfly/react-charts/victory';
import { ChartLineIcon } from '@patternfly/react-icons';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import useMultipleRunMetricHistory from '#~/concepts/modelRegistry/apiHooks/useMultipleRunMetricHistory';

type MultiRunMetricChartProps = {
  metricName: string;
  experimentRuns: RegistryExperimentRun[];
  context?: string;
  width?: number;
  height?: number;
};

type ChartDataPoint = {
  x: number;
  y: number;
  name: string;
  runId: string;
  runName: string;
};

type SeriesData = {
  runId: string;
  runName: string;
  data: ChartDataPoint[];
  color: string;
};

// Predefined colors for different runs
const CHART_COLORS = [
  '#0066CC', // Blue
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Light Blue
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E9', // Sky Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
  '#F1948A', // Pink
];

const MultiRunMetricChart: React.FC<MultiRunMetricChartProps> = ({
  metricName,
  experimentRuns,
  context = 'subset="test"',
  width = 400,
  height = 300,
}) => {
  // Fetch metric history for all runs using the new custom hook
  const [metricHistoryResults, loaded, loadError] = useMultipleRunMetricHistory(
    experimentRuns,
    metricName,
  );

  // Process results into the format expected by the rest of the component
  const processedResults = React.useMemo(
    () =>
      Object.values(metricHistoryResults).map((result) => ({
        run: result.run,
        metricHistory: result.metricHistory,
        loaded: true,
        error: result.error,
      })),
    [metricHistoryResults],
  );

  // Check if all data is loaded and for errors
  const allLoaded = loaded;
  const hasError = !!loadError || processedResults.some((result) => result.error);
  const firstError = loadError || processedResults.find((result) => result.error)?.error;

  // Process data for charting
  const seriesData: SeriesData[] = React.useMemo(() => {
    if (!allLoaded) {
      return [];
    }

    return processedResults.map((result, index) => {
      const { run, metricHistory } = result;
      const color = CHART_COLORS[index % CHART_COLORS.length];

      const chartData: ChartDataPoint[] = [];

      metricHistory.items.forEach((artifact, artifactIndex) => {
        // Extract value from artifact
        let value: number | undefined;
        if ('value' in artifact && typeof artifact.value === 'number') {
          value = artifact.value;
        }

        // Extract step from artifact (use index if no step available)
        let step: number = artifactIndex;
        if ('step' in artifact && typeof artifact.step === 'number') {
          step = artifact.step;
        }

        if (
          value !== undefined &&
          !Number.isNaN(value) &&
          Number.isFinite(value) &&
          !Number.isNaN(step) &&
          Number.isFinite(step)
        ) {
          chartData.push({
            x: step,
            y: value,
            name: metricName,
            runId: run.id,
            runName: run.name || `Run ${run.id.slice(-8)}`,
          });
        }
      });

      return {
        runId: run.id,
        runName: run.name || `Run ${run.id.slice(-8)}`,
        data: chartData.toSorted((a, b) => a.x - b.x),
        color,
      };
    });
  }, [allLoaded, processedResults, metricName]);

  // Calculate domains for better chart scaling
  const { minY, maxY, minX, maxX } = React.useMemo(() => {
    const allPoints = seriesData.flatMap((series) => series.data);
    if (allPoints.length === 0) {
      return { minY: 0, maxY: 1, minX: 0, maxX: 1 };
    }

    const yValues = allPoints.map((d) => d.y);
    const xValues = allPoints.map((d) => d.x);

    const calculatedMinY = Math.min(...yValues);
    const calculatedMaxY = Math.max(...yValues);
    const calculatedMinX = Math.min(...xValues);
    const calculatedMaxX = Math.max(...xValues);

    // Add some padding to Y domain
    const yPadding = (calculatedMaxY - calculatedMinY) * 0.1 || 0.1;

    return {
      minY: calculatedMinY - yPadding,
      maxY: calculatedMaxY + yPadding,
      minX: calculatedMinX,
      maxX: calculatedMaxX,
    };
  }, [seriesData]);

  if (hasError) {
    return (
      <Card style={{ width, height: height + 100 }}>
        <CardHeader>
          <CardTitle>{metricName}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState>
            <ChartLineIcon size={64} />
            <Title headingLevel="h4" size="lg">
              Error loading metric data
            </Title>
            <EmptyStateBody>{firstError?.message}</EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  if (!allLoaded) {
    return (
      <Card style={{ width, height: height + 100 }}>
        <CardHeader>
          <CardTitle>{metricName}</CardTitle>
        </CardHeader>
        <CardBody>
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
        </CardBody>
      </Card>
    );
  }

  // Check if we have any valid data to display
  const hasValidData = seriesData.length > 0 && seriesData.some((series) => series.data.length > 0);

  if (!hasValidData) {
    return (
      <Card style={{ width, height: height + 100, overflow: 'hidden' }}>
        <CardHeader>
          <CardTitle>{metricName}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState>
            <ChartLineIcon size={64} />
            <Title headingLevel="h4" size="lg">
              No metric data available
            </Title>
            <EmptyStateBody>
              No data points found for this metric in the selected runs.
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  // Filter out series with no data to avoid chart rendering issues
  const validSeriesData = seriesData.filter((series) => series.data.length > 0);

  return (
    <Card style={{ width, height: height + 100 }}>
      <CardBody style={{ padding: '16px' }}>
        {/* Metric title */}
        <Title headingLevel="h3" size="lg" style={{ marginBottom: '8px' }}>
          {metricName}
        </Title>

        {/* Context label */}
        <div style={{ marginBottom: '16px' }}>
          <Label color="blue">{context}</Label>
        </div>

        {/* Chart */}
        <Chart
          ariaTitle={`${metricName} metric history for multiple runs`}
          containerComponent={
            <ChartVoronoiContainer
              labels={({ datum }) => `${datum.runName}: Step ${datum.x}, Value: ${datum.y}`}
              constrainToVisibleArea
            />
          }
          domain={{
            x: [minX, maxX],
            y: [minY, maxY],
          }}
          height={height}
          width={width}
          padding={{ left: 70, right: 50, bottom: 50, top: 20 }}
          themeColor={ChartThemeColor.blue}
        >
          <ChartAxis />
          <ChartAxis dependentAxis tickCount={5} />
          <ChartGroup>
            {validSeriesData.map((series) => (
              <React.Fragment key={series.runId}>
                <ChartLine
                  data={series.data}
                  style={{
                    data: {
                      stroke: series.color,
                      strokeWidth: 2,
                    },
                  }}
                  animate={{
                    duration: 300,
                    onLoad: { duration: 300 },
                  }}
                />
                <ChartScatter
                  data={series.data}
                  style={{
                    data: {
                      fill: series.color,
                      stroke: '#ffffff',
                      strokeWidth: 1,
                    },
                  }}
                  size={4}
                  animate={{
                    duration: 300,
                    onLoad: { duration: 300 },
                  }}
                />
              </React.Fragment>
            ))}
          </ChartGroup>
        </Chart>
      </CardBody>
    </Card>
  );
};

export default MultiRunMetricChart;
