import * as React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartThemeColor,
  ChartThreshold,
  ChartVoronoiContainer,
  getResizeObserver,
} from '@patternfly/react-charts';
import { CubesIcon } from '@patternfly/react-icons';
import { TimeframeTimeRange } from '~/pages/modelServing/screens/const';
import { ModelServingMetricsContext } from './ModelServingMetricsContext';
import { MetricChartLine, ProcessedMetrics } from './types';
import {
  convertTimestamp,
  formatToShow,
  getThresholdData,
  createGraphMetricLine,
  useStableMetrics,
} from './utils';

type MetricsChartProps = {
  title: string;
  color?: string;
  metrics: MetricChartLine;
  threshold?: number;
};

const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  color,
  metrics: unstableMetrics,
  threshold,
}) => {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(0);
  const { currentTimeframe, lastUpdateTime } = React.useContext(ModelServingMetricsContext);
  const metrics = useStableMetrics(unstableMetrics, title);

  const { data: graphLines, maxYValue } = React.useMemo(
    () =>
      metrics.reduce<ProcessedMetrics>(
        (acc, metric) => {
          const lineValues = createGraphMetricLine(metric);
          const newMaxValue = Math.max(...lineValues.map((v) => v.y));

          return {
            data: [...acc.data, lineValues],
            maxYValue: Math.max(acc.maxYValue, newMaxValue),
          };
        },
        { data: [], maxYValue: 0 },
      ),
    [metrics],
  );

  const error = metrics.find((line) => line.metric.error)?.metric.error;
  const isAllLoaded = metrics.every((line) => line.metric.loaded);
  const hasSomeData = graphLines.some((line) => line.length > 0);

  React.useEffect(() => {
    const ref = bodyRef.current;
    let observer: ReturnType<typeof getResizeObserver> = () => undefined;
    if (ref) {
      const handleResize = () => {
        setChartWidth(ref.clientWidth);
      };
      observer = getResizeObserver(ref, handleResize);
      handleResize();
    }
    return () => observer();
  }, []);

  let legendProps: Partial<React.ComponentProps<typeof Chart>> = {};
  if (metrics.length > 1 && metrics.every(({ name }) => !!name)) {
    // We don't need a label if there is only one line & we need a name for every item (or it won't align)
    legendProps = {
      legendData: metrics.map(({ name }) => ({ name })),
      legendOrientation: 'horizontal',
      legendPosition: 'bottom-left',
    };
  }

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardBody style={{ height: hasSomeData ? 400 : 200, padding: 0 }}>
        <div ref={bodyRef}>
          {hasSomeData ? (
            <Chart
              ariaTitle={title}
              containerComponent={
                <ChartVoronoiContainer
                  labels={({ datum }) => `${datum.name}: ${datum.y}`}
                  constrainToVisibleArea
                />
              }
              domain={{ y: maxYValue === 0 ? [0, 1] : [0, maxYValue + 1] }}
              height={400}
              width={chartWidth}
              padding={{ left: 70, right: 50, bottom: 70, top: 50 }}
              themeColor={color ?? ChartThemeColor.multi}
              {...legendProps}
            >
              <ChartAxis
                tickFormat={(x) => convertTimestamp(x, formatToShow(currentTimeframe))}
                tickValues={[]}
                domain={{
                  x: [lastUpdateTime - TimeframeTimeRange[currentTimeframe] * 1000, lastUpdateTime],
                }}
                fixLabelOverlap
              />
              <ChartAxis dependentAxis tickCount={10} fixLabelOverlap />
              <ChartGroup>
                {graphLines.map((line, i) => (
                  <ChartArea key={i} data={line} />
                ))}
              </ChartGroup>
              {threshold && <ChartThreshold data={getThresholdData(graphLines, threshold)} />}
            </Chart>
          ) : (
            <EmptyState>
              {isAllLoaded ? (
                <>
                  <EmptyStateIcon icon={CubesIcon} />
                  <Title headingLevel="h4" size="lg">
                    {error ? error.message : 'No available data'}
                  </Title>
                </>
              ) : (
                <>
                  <EmptyStateIcon variant="container" component={Spinner} />
                  <Title headingLevel="h4" size="lg">
                    Loading
                  </Title>
                </>
              )}
            </EmptyState>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default MetricsChart;
