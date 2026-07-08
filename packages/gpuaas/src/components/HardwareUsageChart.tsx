import * as React from 'react';
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartLegendTooltip,
  ChartStack,
  createContainer,
} from '@patternfly/react-charts/victory';
import { getResizeObserver } from '@patternfly/react-core';
import type { HardwareModelUsage } from '../hooks/useInfrastructureMetrics';

type HardwareUsageChartProps = {
  data: HardwareModelUsage[];
};

const CHART_HEIGHT = 300;
const COLOR_IN_USE = 'var(--pf-t--chart--color--blue--300)';
const COLOR_AVAILABLE = 'var(--pf-t--chart--color--black--200)';

const CursorVoronoiContainer = createContainer('voronoi', 'cursor');

const HardwareUsageChart: React.FC<HardwareUsageChartProps> = ({ data }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- cleanup noop until observer is assigned
  const observer = React.useRef(() => {});
  const [width, setWidth] = React.useState(0);
  const [hiddenSeries, setHiddenSeries] = React.useState<Set<string>>(new Set());

  const handleResize = React.useCallback(() => {
    if (containerRef.current?.clientWidth) {
      setWidth(containerRef.current.clientWidth);
    }
  }, []);

  React.useEffect(() => {
    if (containerRef.current) {
      observer.current = getResizeObserver(containerRef.current, handleResize);
      handleResize();
    }
    return () => observer.current();
  }, [handleResize]);

  const toggleSeries = React.useCallback((name: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const inUseHidden = hiddenSeries.has('in-use');
  const availableHidden = hiddenSeries.has('available');

  const legendData = React.useMemo(
    () => [
      {
        childName: 'in-use',
        name: 'In use',
        symbol: { fill: inUseHidden ? COLOR_AVAILABLE : COLOR_IN_USE, type: 'square' },
      },
      {
        childName: 'available',
        name: 'Available',
        symbol: { fill: availableHidden ? COLOR_IN_USE : COLOR_AVAILABLE, type: 'square' },
      },
    ],
    [inUseHidden, availableHidden],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Victory event system is untyped
  const legendEvents: any[] = React.useMemo(() => {
    const handleClick = (_evt: unknown, props: { datum?: { childName?: string } }) => {
      if (props.datum?.childName) {
        toggleSeries(props.datum.childName);
      }
      return null;
    };
    const onMouseOver = () => [{ mutation: () => ({ style: { cursor: 'pointer' } }) }];
    const onMouseOut = () => [{ mutation: () => null }];
    return [
      { target: 'data', eventHandlers: { onClick: handleClick, onMouseOver, onMouseOut } },
      { target: 'labels', eventHandlers: { onClick: handleClick, onMouseOver, onMouseOut } },
    ];
  }, [toggleSeries]);

  const inUseData = React.useMemo(
    () =>
      data.map(({ modelName, inUse }) => ({
        x: modelName,
        y: inUseHidden ? 0 : inUse,
      })),
    [data, inUseHidden],
  );

  const availableData = React.useMemo(
    () =>
      data.map(({ modelName, available }) => ({
        x: modelName,
        y: availableHidden ? 0 : available,
      })),
    [data, availableHidden],
  );

  const maxY = React.useMemo(() => {
    let max = 0;
    for (const { inUse, available } of data) {
      const total = (inUseHidden ? 0 : inUse) + (availableHidden ? 0 : available);
      if (total > max) {
        max = total;
      }
    }
    return Math.max(max, 1);
  }, [data, inUseHidden, availableHidden]);

  const plotWidth = width - 90;
  const domainPad = Math.max(30, plotWidth / (data.length * 3));
  const barWidth = Math.max(20, (plotWidth - domainPad * 2) / (data.length * 2));

  return (
    <div ref={containerRef}>
      <Chart
        ariaTitle="Hardware usage"
        ariaDesc="Stacked bar chart showing accelerator usage per hardware model"
        height={CHART_HEIGHT}
        width={width}
        domainPadding={{ x: domainPad }}
        domain={{ y: [0, maxY * 1.1] }}
        padding={{ bottom: 75, left: 60, right: 30, top: 30 }}
        legendData={legendData}
        legendPosition="bottom"
        legendAllowInteractive
        events={legendEvents}
        containerComponent={
          <CursorVoronoiContainer
            cursorDimension="x"
            voronoiDimension="x"
            voronoiPadding={50}
            mouseFollowTooltips
            labels={({ datum }: { datum: { y: number } }) => `${datum.y}`}
            labelComponent={
              <ChartLegendTooltip legendData={legendData} title={(args) => String(args.x ?? '')} />
            }
            constrainToVisibleArea
          />
        }
      >
        <ChartAxis
          label="Accelerators"
          dependentAxis
          showGrid
          style={{ axisLabel: { padding: 45 } }}
        />
        <ChartAxis />
        <ChartStack colorScale={[COLOR_IN_USE, COLOR_AVAILABLE]}>
          <ChartBar data={inUseData} name="in-use" barWidth={barWidth} />
          <ChartBar data={availableData} name="available" barWidth={barWidth} />
        </ChartStack>
      </Chart>
    </div>
  );
};

export default HardwareUsageChart;
