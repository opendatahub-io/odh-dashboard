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
  ChartThreshold,
  ChartVoronoiContainer,
  getResizeObserver,
} from '@patternfly/react-charts';
import { convertTimestamp, formatToShow, getThresholdData } from './utils';
import { ModelServingMetricsContext } from './ModelServingMetricsContext';
import { CubesIcon } from '@patternfly/react-icons';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '../../../../types';
import { TimeframeTime } from '../const';

type MetricsChartProps = {
  title: string;
  color: string;
  metrics: ContextResourceData<PrometheusQueryRangeResultValue>;
  unit?: string;
  threshold?: number;
};

const MetricsChart: React.FC<MetricsChartProps> = ({ title, color, metrics, unit, threshold }) => {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(0);
  const { currentTimeframe, lastUpdateTime } = React.useContext(ModelServingMetricsContext);

  const processedData = React.useMemo(
    () =>
      metrics.data?.map((data) => ({
        x: data[0] * 1000,
        y: parseInt(data[1]),
        name: title,
      })) || [],
    [metrics, title],
  );

  const maxValue = Math.max(...processedData.map((e) => e.y));

  const hasData = processedData.length > 0;

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
  }, [bodyRef]);

  return (
    <Card>
      <CardTitle>{`${title}${unit ? ` (${unit})` : ''}`}</CardTitle>
      <CardBody style={{ height: hasData ? 400 : 200, padding: 0 }}>
        <div ref={bodyRef}>
          {hasData ? (
            <Chart
              ariaTitle={title}
              containerComponent={
                <ChartVoronoiContainer
                  labels={({ datum }) => `${datum.name}: ${datum.y}`}
                  constrainToVisibleArea
                />
              }
              domain={{ y: maxValue === 0 ? [-1, 1] : [0, maxValue + 1] }}
              height={400}
              width={chartWidth}
              padding={{ left: 70, right: 50, bottom: 70, top: 50 }}
              themeColor={color}
            >
              <ChartAxis
                tickCount={10}
                tickFormat={(x) => convertTimestamp(x, formatToShow(currentTimeframe))}
                domain={{
                  x: [lastUpdateTime - TimeframeTime[currentTimeframe] * 1000, lastUpdateTime],
                }}
                fixLabelOverlap
              />
              <ChartAxis dependentAxis tickCount={10} fixLabelOverlap />
              <ChartGroup>
                <ChartArea data={processedData} />
              </ChartGroup>
              {threshold && <ChartThreshold data={getThresholdData(processedData, threshold)} />}
            </Chart>
          ) : (
            <EmptyState>
              {metrics.loaded ? (
                <>
                  <EmptyStateIcon icon={CubesIcon} />
                  <Title headingLevel="h4" size="lg">
                    {metrics.error ? metrics.error.message : 'No available data'}
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
