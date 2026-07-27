import * as React from 'react';
import ReactDOM from 'react-dom';
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartLabel,
  ChartLegend,
  ChartStack,
  createContainer,
} from '@patternfly/react-charts/victory';
import { LineSegment } from 'victory-core';
import { chart_axis_grid_stroke_Color as chartStrokeColor } from '@patternfly/react-tokens';
import {
  Flex,
  FlexItem,
  Panel,
  PanelMain,
  PanelMainBody,
  getResizeObserver,
} from '@patternfly/react-core';
import type { HardwareModelUsage } from '../hooks/useInfrastructureMetrics';
import { AXIS_DIRECTION_LABEL_STYLE } from '../const';

type HardwareUsageChartProps = {
  data: HardwareModelUsage[];
};

const CursorContainer = createContainer('cursor', 'cursor');

const CHART_HEIGHT = 300;
const COLOR_IN_USE = 'var(--pf-t--chart--color--blue--300)';
const COLOR_AVAILABLE = 'var(--pf-t--chart--color--black--200)';
const COLOR_HIDDEN = 'var(--pf-t--global--color--disabled)';
const TOOLTIP_OFFSET_X = 14;
const TOOLTIP_OFFSET_Y = -20;

const SWATCH_BASE: React.CSSProperties = {
  display: 'inline-block',
  width: 10,
  height: 10,
  borderRadius: 2,
};
const SWATCH_IN_USE: React.CSSProperties = { ...SWATCH_BASE, background: COLOR_IN_USE };
const SWATCH_AVAILABLE: React.CSSProperties = { ...SWATCH_BASE, background: COLOR_AVAILABLE };

type HardwareTooltipProps = {
  activeModel: string;
  mousePos: { x: number; y: number };
  data: HardwareModelUsage[];
};

const HardwareTooltip: React.FC<HardwareTooltipProps> = ({ activeModel, mousePos, data }) => {
  const entry = data.find((d) => d.modelName === activeModel);
  if (!entry) {
    return null;
  }

  return ReactDOM.createPortal(
    <Panel
      variant="bordered"
      style={{
        position: 'fixed',
        left: mousePos.x + TOOLTIP_OFFSET_X,
        top: mousePos.y + TOOLTIP_OFFSET_Y,
        width: 'max-content',
        maxWidth: 320,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <PanelMain>
        <PanelMainBody>
          <strong>{entry.modelName}</strong>
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
            <FlexItem>
              <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <span style={SWATCH_IN_USE} />
                </FlexItem>
                <FlexItem>{`In use: ${entry.inUse}`}</FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem>
              <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <span style={SWATCH_AVAILABLE} />
                </FlexItem>
                <FlexItem>{`Available: ${entry.available}`}</FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </PanelMainBody>
      </PanelMain>
    </Panel>,
    document.body,
  );
};

const HardwareUsageChart: React.FC<HardwareUsageChartProps> = ({ data }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- cleanup noop until observer is assigned
  const observer = React.useRef(() => {});
  const [width, setWidth] = React.useState(0);
  const [hiddenSeries, setHiddenSeries] = React.useState<Set<string>>(new Set());
  const [activeModel, setActiveModel] = React.useState<string | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

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

  React.useEffect(() => {
    if (!activeModel) {
      return undefined;
    }
    let rafId = 0;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY });
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [activeModel]);

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
        symbol: { fill: inUseHidden ? COLOR_HIDDEN : COLOR_IN_USE, type: 'square' },
      },
      {
        childName: 'available',
        name: 'Available',
        symbol: { fill: availableHidden ? COLOR_HIDDEN : COLOR_AVAILABLE, type: 'square' },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Victory event system is untyped
  const barEvents: any[] = React.useMemo(
    () => [
      {
        target: 'data',
        eventHandlers: {
          onMouseOver: (_evt: React.SyntheticEvent, props: { datum?: { x?: string } }) => {
            if (props.datum?.x) {
              setActiveModel(props.datum.x);
            }
            return null;
          },
          onMouseOut: () => {
            setActiveModel(null);
            return null;
          },
        },
      },
    ],
    [],
  );

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
        legendComponent={<ChartLegend events={legendEvents} />}
        containerComponent={
          <CursorContainer
            cursorDimension="x"
            cursorComponent={
              <LineSegment
                style={{
                  stroke: chartStrokeColor.var,
                  strokeDasharray: '2 3',
                  strokeOpacity: 0.6,
                  strokeWidth: 1,
                }}
              />
            }
          />
        }
      >
        <ChartLabel
          text="Accelerators"
          x={4}
          y={18}
          style={AXIS_DIRECTION_LABEL_STYLE}
          textAnchor="start"
        />
        <ChartAxis dependentAxis showGrid />
        <ChartAxis />
        <ChartStack colorScale={[COLOR_IN_USE, COLOR_AVAILABLE]}>
          <ChartBar data={inUseData} name="in-use" barWidth={barWidth} events={barEvents} />
          <ChartBar data={availableData} name="available" barWidth={barWidth} events={barEvents} />
        </ChartStack>
      </Chart>
      {activeModel && <HardwareTooltip activeModel={activeModel} mousePos={mousePos} data={data} />}
    </div>
  );
};

export default HardwareUsageChart;
