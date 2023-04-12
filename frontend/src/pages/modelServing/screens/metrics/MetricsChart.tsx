import * as React from 'react';
import {
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateIcon,
  Spinner,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartThemeColor,
  ChartThreshold,
  ChartVoronoiContainer,
  getResizeObserver,
  getThresholdTheme,
} from '@patternfly/react-charts';
import { CubesIcon } from '@patternfly/react-icons';
import { DomainTuple, ForAxes } from 'victory-core';
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

export type DomainCalculator = (maxYValue: number) => ForAxes<DomainTuple>;

type MetricsChartProps = {
  title: string;
  color?: string;
  metrics: MetricChartLine;
  threshold?: number;
  minThreshold?: number;
  //TODO: this needs to be an enum not a string allowing any color under the sun.
  /*
    [
    {
      value: number
      color?: emum
      label?: string
    }
    ]
   */
  thresholdColor?: string;
  //TODO: Consider a different parameter name
  domainCalc: DomainCalculator;
  toolbar?: React.ReactNode;
};

const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  color,
  metrics: unstableMetrics,
  threshold,
  minThreshold,
  thresholdColor,
  //TODO: Make optional with default value (use inference graph lambda as default) and remove the
  // values from InferenceGraphs and RuntimeGraphs. - Default should be add 0 to max.
  domainCalc,
  toolbar,
}) => {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(0);
  const { currentTimeframe, lastUpdateTime } = React.useContext(ModelServingMetricsContext);
  const metrics = useStableMetrics(unstableMetrics, title);

  //TODO: Add minYValue here and to domainCalc call below.
  const { data: graphLines, maxYValue } = React.useMemo(
    () =>
      metrics.reduce<ProcessedMetrics>(
        (acc, metric) => {
          const lineValues = createGraphMetricLine(metric);
          const newMaxValue = Math.max(...lineValues.map((v) => Math.abs(v.y)));

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
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {
          //TODO: Only accept React Nodes of type Toolbar Content. Look at table as an example.
        }
        {toolbar && <CardActions>{toolbar}</CardActions>}
      </CardHeader>
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
              domain={domainCalc(maxYValue)}
              //TODO: remove commented code below before PR - they're useful to keep around for now though.
              //domain={{ y: maxYValue === 0 ? [0, 1] : [0, maxYValue] }}
              //domain={{ y: [-1, 1] }}
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
              {threshold && (
                <ChartThreshold
                  data={getThresholdData(graphLines, threshold)}
                  style={
                    thresholdColor
                      ? {
                          data: { stroke: thresholdColor },
                        }
                      : undefined
                  }
                />
              )}
              {minThreshold && (
                <ChartThreshold
                  data={getThresholdData(graphLines, minThreshold)}
                  //TODO: We should stick to PF variables,
                  style={
                    thresholdColor
                      ? {
                          data: { stroke: thresholdColor },
                        }
                      : undefined
                  }
                />
              )}
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
