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
  Title,
  Toolbar,
  ToolbarContent,
} from '@patternfly/react-core';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLegendTooltip,
  ChartLine,
  ChartStack,
  ChartThemeColor,
  ChartThemeDefinition,
  ChartThreshold,
  ChartVoronoiContainer,
  createContainer,
  getResizeObserver,
} from '@patternfly/react-charts';
import { CubesIcon } from '@patternfly/react-icons';
import { TimeframeTimeRange } from '~/pages/modelServing/screens/const';
import { ModelServingMetricsContext } from './ModelServingMetricsContext';
import {
  DomainCalculator,
  MetricChartLine,
  MetricChartThreshold,
  MetricsChartTypes,
  ProcessedMetrics,
} from './types';
import {
  convertTimestamp,
  createGraphMetricLine,
  defaultDomainCalculator,
  formatToShow,
  getThresholdData,
  useStableMetrics,
} from './utils';

type MetricsChartProps = {
  title: string;
  color?: string;
  metrics: MetricChartLine;
  thresholds?: MetricChartThreshold[];
  domain?: DomainCalculator;
  toolbar?: React.ReactElement<typeof ToolbarContent>;
  type?: MetricsChartTypes;
  isStack?: boolean;
  theme?: ChartThemeDefinition;
  hasPatterns?: boolean;
};
const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  color,
  metrics: unstableMetrics,
  thresholds = [],
  domain = defaultDomainCalculator,
  toolbar,
  type = MetricsChartTypes.AREA,
  isStack = false,
  theme,
  hasPatterns = false,
}) => {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = React.useState(0);
  const { currentTimeframe, lastUpdateTime } = React.useContext(ModelServingMetricsContext);
  const metrics = useStableMetrics(unstableMetrics, title);
  const CursorVoronoiContainer = React.useMemo(() => createContainer('voronoi', 'cursor'), []);
  const [tooltipDisabled, setTooltipDisabled] = React.useState(false);
  const [tooltipTitle, setTooltipTitle] = React.useState(
    convertTimestamp(Date.now(), formatToShow(currentTimeframe)),
  );

  const {
    data: graphLines,
    maxYValue,
    minYValue,
    maxXValue,
    minXValue,
  } = React.useMemo(
    () =>
      metrics.reduce<ProcessedMetrics>(
        (acc, metric) => {
          const lineValues = createGraphMetricLine(metric);
          const newMaxYValue = Math.max(...lineValues.map((v) => v.y));
          const newMinYValue = Math.min(...lineValues.map((v) => v.y));
          const newMaxXValue = Math.max(...lineValues.map((v) => v.x));
          const newMinXValue = Math.min(...lineValues.map((v) => v.x));

          return {
            data: [...acc.data, { points: lineValues, name: metric.name }],
            maxYValue: Math.max(acc.maxYValue, newMaxYValue),
            minYValue: Math.min(acc.minYValue, newMinYValue),
            maxXValue: Math.max(acc.maxXValue, newMaxXValue),
            minXValue: Math.min(acc.minXValue, newMinXValue),
          };
        },
        { data: [], maxYValue: 0, minYValue: 0, maxXValue: 0, minXValue: Date.now() },
      ),
    [metrics],
  );

  const error = metrics.find((line) => line.metric.error)?.metric.error;
  const isAllLoaded = metrics.every((line) => line.metric.loaded);
  const hasSomeData = graphLines.some((line) => line.points.length > 0);

  const ChartGroupWrapper = React.useMemo(() => (isStack ? ChartStack : ChartGroup), [isStack]);

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

  const handleCursorChange = React.useCallback(
    (xValue: number) => {
      if (!xValue) {
        return;
      }
      setTooltipTitle(convertTimestamp(xValue, formatToShow(currentTimeframe)));
      if (xValue < minXValue || xValue > maxXValue) {
        setTooltipDisabled(true);
      } else {
        setTooltipDisabled(false);
      }
    },
    [minXValue, currentTimeframe, maxXValue],
  );

  let legendProps: Partial<React.ComponentProps<typeof Chart>> = {};
  let containerComponent;
  if (metrics.length > 1 && metrics.every(({ name }) => !!name)) {
    // We don't need a label if there is only one line & we need a name for every item (or it won't align)
    const legendData = metrics.map(({ name }) => ({ name, childName: name }));
    legendProps = {
      legendData,
      legendOrientation: 'horizontal',
      legendPosition: 'bottom-left',
    };
    containerComponent = (
      <CursorVoronoiContainer
        cursorDimension="x"
        labels={({ datum }: { datum: { y: number } }) => (tooltipDisabled ? 'No data' : datum.y)}
        labelComponent={<ChartLegendTooltip legendData={legendData} title={tooltipTitle} />}
        onCursorChange={handleCursorChange}
        mouseFollowTooltips
        voronoiDimension="x"
        voronoiPadding={50}
      />
    );
  } else {
    containerComponent = (
      <ChartVoronoiContainer
        labels={({ datum }) => `${datum.name}: ${datum.y}`}
        constrainToVisibleArea
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {toolbar && (
          <CardActions>
            <Toolbar>{toolbar}</Toolbar>
          </CardActions>
        )}
      </CardHeader>
      <CardBody style={{ height: hasSomeData ? 400 : 200, padding: 0 }}>
        <div ref={bodyRef}>
          {hasSomeData ? (
            <Chart
              ariaTitle={title}
              containerComponent={containerComponent}
              domain={domain(maxYValue, minYValue)}
              height={400}
              width={chartWidth}
              padding={{ left: 70, right: 50, bottom: 70, top: 50 }}
              themeColor={color ?? ChartThemeColor.multi}
              theme={theme}
              hasPatterns={hasPatterns}
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
              <ChartGroupWrapper>
                {graphLines.map((line, i) => {
                  switch (type) {
                    case MetricsChartTypes.AREA:
                      return <ChartArea key={i} data={line.points} name={line.name} />;
                    case MetricsChartTypes.LINE:
                      return <ChartLine key={i} data={line.points} name={line.name} />;
                    default:
                      return null;
                  }
                })}
              </ChartGroupWrapper>
              {thresholds.map((t) => (
                <ChartThreshold
                  key={t.value}
                  data={getThresholdData(
                    graphLines.map((lines) => lines.points),
                    t.value,
                  )}
                  style={t.color ? { data: { stroke: t.color } } : undefined}
                  name={t.label}
                />
              ))}
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
