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
import useExperimentRunMetricHistory from '#~/concepts/modelRegistry/apiHooks/useExperimentRunMetricHistory.ts';

type MetricHistoryChartProps = {
  experimentRunId: string;
  metricName: string;
  context?: string;
  width?: number;
  height?: number;
};

type ChartDataPoint = {
  x: number;
  y: number;
  name: string;
};

const MetricHistoryChart: React.FC<MetricHistoryChartProps> = ({
  experimentRunId,
  metricName,
  context = 'subset="test"',
  width = 400,
  height = 300,
}) => {
  const [metricHistory, loaded, error] = useExperimentRunMetricHistory(experimentRunId, metricName);

  // Process the metric history data for charting
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!metricHistory.items.length) {
      return [];
    }

    const validPoints: ChartDataPoint[] = [];

    metricHistory.items.forEach((artifact, index) => {
      // Extract value from artifact
      let value: number | undefined;
      if ('value' in artifact && typeof artifact.value === 'number') {
        value = artifact.value;
      }

      // Extract step from artifact (use index if no step available)
      let step: number = index;
      if ('step' in artifact && typeof artifact.step === 'number') {
        step = artifact.step;
      }

      if (value !== undefined) {
        validPoints.push({ x: step, y: value, name: metricName });
      }
    });

    return validPoints.toSorted((a, b) => a.x - b.x); // Sort by step
  }, [metricHistory.items, metricName]);

  // Calculate domains for better chart scaling
  const { minY, maxY, minX, maxX } = React.useMemo(() => {
    if (chartData.length === 0) {
      return { minY: 0, maxY: 1, minX: 0, maxX: 1 };
    }

    const yValues = chartData.map((d) => d.y);
    const xValues = chartData.map((d) => d.x);

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
  }, [chartData]);

  if (error) {
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
            <EmptyStateBody>{error.message}</EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  if (!loaded) {
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

  if (chartData.length === 0) {
    return (
      <Card style={{ width, height: height + 100 }}>
        <CardHeader>
          <CardTitle>{metricName}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState>
            <ChartLineIcon size={64} />
            <Title headingLevel="h4" size="lg">
              No metric data available
            </Title>
            <EmptyStateBody>No data points found for this metric.</EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

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
        <div style={{ height }}>
          <Chart
            ariaTitle={`${metricName} metric history`}
            containerComponent={
              <ChartVoronoiContainer
                labels={({ datum }) => `Step: ${datum.x}, Value: ${datum.y}`}
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
              <ChartLine
                data={chartData}
                style={{
                  data: {
                    strokeWidth: 2,
                  },
                }}
                animate={{
                  duration: 300,
                  onLoad: { duration: 300 },
                }}
              />
              <ChartScatter
                data={chartData}
                style={{
                  data: {
                    fill: '#0066cc',
                    stroke: '#ffffff',
                    strokeWidth: 1,
                  },
                }}
                size={5}
                animate={{
                  duration: 300,
                  onLoad: { duration: 300 },
                }}
              />
            </ChartGroup>
          </Chart>
        </div>
      </CardBody>
    </Card>
  );
};

export default MetricHistoryChart;
