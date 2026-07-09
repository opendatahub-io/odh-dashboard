import React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  createContainer,
} from '@patternfly/react-charts/victory';
import { Flex, FlexItem } from '@patternfly/react-core';
import type { CurvesData, RocCurveEntry } from '~/app/types';
import { chartColorBlack500, CHART_PADDING, COLOR_SCALE, TICK_VALUES } from './chartConstants';
import ChartLegendDot from './ChartLegendDot';

type CurveLineData = {
  label: string;
  auc: number;
  points: { name: string; x: number; y: number; index: number }[];
};

function buildCurveLineFromEntry(
  entry: RocCurveEntry,
  label: string,
  index: number,
): CurveLineData {
  return {
    label,
    auc: entry.auc,
    points: entry.fpr.map((x, i) => ({
      name: label,
      x,
      y: entry.tpr[i],
      index,
    })),
  };
}

function buildMacroAverageCurve(
  perClass: Record<string, RocCurveEntry>,
  aucMacro: number,
  index: number,
): CurveLineData {
  const NUM_POINTS = 101;
  const commonFpr = Array.from({ length: NUM_POINTS }, (_, i) => i / (NUM_POINTS - 1));
  const entries = Object.values(perClass);

  const avgTpr = commonFpr.map((fprVal) => {
    const tprSum = entries.reduce((sum, entry) => {
      const { fpr, tpr } = entry;
      let interpolatedTpr = tpr[tpr.length - 1];
      for (let j = 0; j < fpr.length - 1; j++) {
        if (fprVal >= fpr[j] && fprVal <= fpr[j + 1]) {
          const range = fpr[j + 1] - fpr[j];
          const t = range === 0 ? 0 : (fprVal - fpr[j]) / range;
          interpolatedTpr = tpr[j] + t * (tpr[j + 1] - tpr[j]);
          break;
        }
      }
      return sum + interpolatedTpr;
    }, 0);
    return tprSum / entries.length;
  });

  return {
    label: 'Multi-class',
    auc: aucMacro,
    points: commonFpr.map((x, i) => ({
      name: 'Multi-class',
      x,
      y: avgTpr[i],
      index,
    })),
  };
}

export function buildCurveLines(rocCurveData: CurvesData): CurveLineData[] {
  if (rocCurveData.task_type === 'binary') {
    return [buildCurveLineFromEntry(rocCurveData.roc_curve, 'ROC curve', 0)];
  }

  const { per_class: perClass, auc_macro: aucMacro } = rocCurveData.roc_curve;
  const classLines = Object.entries(perClass).map(([className, entry], idx) =>
    buildCurveLineFromEntry(entry, className, idx),
  );
  const macroLine = buildMacroAverageCurve(perClass, aucMacro, classLines.length);
  return [...classLines, macroLine];
}

export function getAucValue(rocCurveData: CurvesData): number {
  if (rocCurveData.task_type === 'binary') {
    return rocCurveData.roc_curve.auc;
  }
  return rocCurveData.roc_curve.auc_macro;
}

type ROCCurveChartProps = {
  rocCurveData: CurvesData;
};

const BASELINE_STYLE = { data: { strokeDasharray: '3,3', stroke: chartColorBlack500.value } };
const BASELINE_DATA = Array.from({ length: 101 }, (_, i) => ({
  x: i / 100,
  y: i / 100,
  name: 'Reference (random classifier)',
}));

const CHART_WIDTH = 560;
const CHART_HEIGHT = 350;

const AXIS_TICK_STYLE = { tickLabels: { fontSize: 10 } };
const AXIS_LABEL_STYLE = { axisLabel: { fontSize: 11, padding: 40 } };
const DEPENDENT_AXIS_LABEL_STYLE = { axisLabel: { fontSize: 11, padding: 55 } };

const AXIS_LEFT = CHART_PADDING.left;
const AXIS_BOTTOM = CHART_HEIGHT - CHART_PADDING.bottom;
const CHART_RIGHT = CHART_WIDTH - CHART_PADDING.right;

const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

const CROSSHAIR_STROKE = chartColorBlack500.value;
const AXIS_LABEL_W = 48;
const AXIS_LABEL_H = 18;
const TOOLTIP_W = 155;

const CURSOR_LINE = <line stroke={CROSSHAIR_STROKE} strokeDasharray="4 4" strokeWidth={0.5} />;

const CursorVoronoiContainer = createContainer('cursor', 'voronoi');

const cursorState = { svgY: 0, dataY: 0 };
const chartState: { curveLines: CurveLineData[] } = { curveLines: [] };

type TooltipDatum = { name: string; x: number; y: number; index: number };

type ROCCurveTooltipProps = {
  datum?: TooltipDatum;
  active?: boolean;
  [key: string]: unknown;
};

const TOOLTIP_ROW_H = 16;
const TOOLTIP_PAD = 10;

function findNearestY(points: CurveLineData['points'], targetX: number): number {
  let nearest = points[0];
  let minDist = Math.abs(points[0].x - targetX);
  for (let i = 1; i < points.length; i++) {
    const dist = Math.abs(points[i].x - targetX);
    if (dist < minDist) {
      minDist = dist;
      nearest = points[i];
    }
  }
  return nearest.y;
}

const ROCCurveTooltip = ({ datum, active }: ROCCurveTooltipProps): React.ReactElement | null => {
  if (!active || !datum) {
    return <g />;
  }

  const fpr = datum.x.toFixed(4);
  const dotX = AXIS_LEFT + datum.x * PLOT_WIDTH;
  const cy = cursorState.svgY;
  const lines = chartState.curveLines;
  const isBinary = lines.length === 1;

  const tooltipFlipped = dotX + 15 + TOOLTIP_W > CHART_RIGHT;
  const tx = tooltipFlipped ? -TOOLTIP_W - 15 : 15;

  if (isBinary) {
    const color = COLOR_SCALE[0];
    const dotY = AXIS_BOTTOM - datum.y * PLOT_HEIGHT;
    const tooltipH = TOOLTIP_PAD * 2 + 3 * TOOLTIP_ROW_H;
    const ty = Math.max(
      CHART_PADDING.top - cy,
      Math.min(-tooltipH / 2, AXIS_BOTTOM - tooltipH - cy),
    );

    return (
      <g className="automl-roc-tooltip">
        <g style={{ transform: `translateY(${cy}px)` }}>
          <rect
            x={AXIS_LEFT - AXIS_LABEL_W - 2}
            y={-AXIS_LABEL_H / 2}
            width={AXIS_LABEL_W}
            height={AXIS_LABEL_H}
            rx={3}
            fill={CROSSHAIR_STROKE}
          />
          <text
            x={AXIS_LEFT - AXIS_LABEL_W / 2 - 2}
            y={4}
            textAnchor="middle"
            fontSize={9}
            fill="white"
            fontFamily="var(--pf-t--global--font--family--body)"
          >
            {cursorState.dataY.toFixed(4)}
          </text>
        </g>
        <g style={{ transform: `translateX(${dotX}px)` }}>
          <rect
            x={-AXIS_LABEL_W / 2}
            y={AXIS_BOTTOM + 3}
            width={AXIS_LABEL_W}
            height={AXIS_LABEL_H}
            rx={3}
            fill={CROSSHAIR_STROKE}
          />
          <text
            x={0}
            y={AXIS_BOTTOM + 3 + AXIS_LABEL_H / 2 + 4}
            textAnchor="middle"
            fontSize={9}
            fill="white"
            fontFamily="var(--pf-t--global--font--family--body)"
          >
            {fpr}
          </text>
        </g>
        <g style={{ transform: `translate(${dotX}px, ${dotY}px)` }}>
          <circle cx={0} cy={0} r={4} fill={color} />
        </g>
        <g style={{ transform: `translate(${dotX}px, ${cy}px)` }}>
          <rect
            x={tx}
            y={ty}
            width={TOOLTIP_W}
            height={tooltipH}
            rx={4}
            fill="var(--pf-t--global--background--color--primary--default)"
            stroke="var(--pf-t--global--border--color--default)"
            strokeWidth={1}
          />
          <circle cx={tx + 14} cy={ty + TOOLTIP_PAD} r={3} fill={color} />
          <text
            x={tx + 24}
            y={ty + TOOLTIP_PAD + 4}
            fontSize={11}
            fill="var(--pf-t--global--text--color--regular)"
            fontFamily="var(--pf-t--global--font--family--body)"
          >
            {datum.name}
          </text>
          <text
            x={tx + 14}
            y={ty + TOOLTIP_PAD + TOOLTIP_ROW_H + 4}
            fontSize={11}
            fill="var(--pf-t--global--text--color--regular)"
            fontFamily="var(--pf-t--global--font--family--body)"
          >
            FPR: {fpr}
          </text>
          <text
            x={tx + 14}
            y={ty + TOOLTIP_PAD + 2 * TOOLTIP_ROW_H + 4}
            fontSize={11}
            fill="var(--pf-t--global--text--color--regular)"
            fontFamily="var(--pf-t--global--font--family--body)"
          >
            TPR: {datum.y.toFixed(4)}
          </text>
        </g>
      </g>
    );
  }

  type SeriesPoint = { label: string; index: number; y: number };
  const seriesPoints: SeriesPoint[] = lines.map((line, idx) => ({
    label: line.label,
    index: idx,
    y: findNearestY(line.points, datum.x),
  }));

  const tooltipH = TOOLTIP_PAD * 2 + TOOLTIP_ROW_H + seriesPoints.length * TOOLTIP_ROW_H;
  const ty = Math.max(CHART_PADDING.top - cy, Math.min(-tooltipH / 2, AXIS_BOTTOM - tooltipH - cy));

  return (
    <g className="automl-roc-tooltip">
      {/* Y-axis value label */}
      <g style={{ transform: `translateY(${cy}px)` }}>
        <rect
          x={AXIS_LEFT - AXIS_LABEL_W - 2}
          y={-AXIS_LABEL_H / 2}
          width={AXIS_LABEL_W}
          height={AXIS_LABEL_H}
          rx={3}
          fill={CROSSHAIR_STROKE}
        />
        <text
          x={AXIS_LEFT - AXIS_LABEL_W / 2 - 2}
          y={4}
          textAnchor="middle"
          fontSize={9}
          fill="white"
          fontFamily="var(--pf-t--global--font--family--body)"
        >
          {cursorState.dataY.toFixed(4)}
        </text>
      </g>

      {/* X-axis value label */}
      <g style={{ transform: `translateX(${dotX}px)` }}>
        <rect
          x={-AXIS_LABEL_W / 2}
          y={AXIS_BOTTOM + 3}
          width={AXIS_LABEL_W}
          height={AXIS_LABEL_H}
          rx={3}
          fill={CROSSHAIR_STROKE}
        />
        <text
          x={0}
          y={AXIS_BOTTOM + 3 + AXIS_LABEL_H / 2 + 4}
          textAnchor="middle"
          fontSize={9}
          fill="white"
          fontFamily="var(--pf-t--global--font--family--body)"
        >
          {fpr}
        </text>
      </g>

      {/* Dots on each curve */}
      {seriesPoints.map((sp) => {
        const spColor = COLOR_SCALE[sp.index % COLOR_SCALE.length];
        const spY = AXIS_BOTTOM - sp.y * PLOT_HEIGHT;
        return (
          <g key={sp.label} style={{ transform: `translate(${dotX}px, ${spY}px)` }}>
            <circle cx={0} cy={0} r={4} fill={spColor} />
          </g>
        );
      })}

      {/* Combined tooltip */}
      <g style={{ transform: `translate(${dotX}px, ${cy}px)` }}>
        <rect
          x={tx}
          y={ty}
          width={TOOLTIP_W}
          height={tooltipH}
          rx={4}
          fill="var(--pf-t--global--background--color--primary--default)"
          stroke="var(--pf-t--global--border--color--default)"
          strokeWidth={1}
        />
        <text
          x={tx + 10}
          y={ty + TOOLTIP_PAD + 4}
          fontSize={10}
          fontWeight="bold"
          fill="var(--pf-t--global--text--color--regular)"
          fontFamily="var(--pf-t--global--font--family--body)"
        >
          FPR: {fpr}
        </text>
        {seriesPoints.map((sp, i) => {
          const spColor = COLOR_SCALE[sp.index % COLOR_SCALE.length];
          const rowY = ty + TOOLTIP_PAD + (i + 1) * TOOLTIP_ROW_H;
          return (
            <g key={sp.label}>
              <circle cx={tx + 10} cy={rowY} r={3} fill={spColor} />
              <text
                x={tx + 20}
                y={rowY + 4}
                fontSize={10}
                fill="var(--pf-t--global--text--color--regular)"
                fontFamily="var(--pf-t--global--font--family--body)"
              >
                {sp.label} TPR: {sp.y.toFixed(3)}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
};

const handleCursorChange = (point: { x: number; y: number } | null): void => {
  if (point) {
    cursorState.dataY = Math.max(0, Math.min(1, point.y));
    cursorState.svgY = AXIS_BOTTOM - cursorState.dataY * PLOT_HEIGHT;
  }
};

const ROCCurveChart: React.FC<ROCCurveChartProps> = ({ rocCurveData }) => {
  const curveLines = React.useMemo(() => buildCurveLines(rocCurveData), [rocCurveData]);
  chartState.curveLines = curveLines;

  return (
    <div data-testid="roc-curve-chart">
      <div className="automl-roc-curve-chart">
        <Chart
          ariaDesc="ROC Curve"
          ariaTitle=""
          containerComponent={
            <CursorVoronoiContainer
              constrainToVisibleArea
              cursorComponent={CURSOR_LINE}
              onCursorChange={handleCursorChange}
              voronoiDimension="x"
              labels={({ datum }: { datum: { name: string } }) =>
                datum.name === 'Reference (random classifier)' ? '' : ' '
              }
              labelComponent={<ROCCurveTooltip />}
              voronoiBlacklist={['baseline']}
            />
          }
          height={CHART_HEIGHT}
          width={CHART_WIDTH}
          padding={CHART_PADDING}
        >
          <ChartAxis
            showGrid
            dependentAxis
            label="True positive rate (sensitivity)"
            tickValues={TICK_VALUES}
            style={{ ...AXIS_TICK_STYLE, ...DEPENDENT_AXIS_LABEL_STYLE }}
          />
          <ChartAxis
            showGrid
            label="False positive rate (1-specificity)"
            tickValues={TICK_VALUES}
            style={{ ...AXIS_TICK_STYLE, ...AXIS_LABEL_STYLE }}
          />
          <ChartLine name="baseline" data={BASELINE_DATA} style={BASELINE_STYLE} />
          <ChartGroup groupComponent={<g className="automl-roc-curves" />}>
            {curveLines.map((line, idx) => (
              <ChartLine
                key={line.label}
                data={line.points}
                interpolation="monotoneX"
                style={{
                  data: {
                    stroke: COLOR_SCALE[idx % COLOR_SCALE.length],
                  },
                }}
              />
            ))}
          </ChartGroup>
        </Chart>
      </div>
      <Flex
        gap={{ default: 'gapLg' }}
        justifyContent={{ default: 'justifyContentCenter' }}
        className="pf-v6-u-mt-sm pf-v6-u-font-size-sm"
      >
        <FlexItem>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <ChartLegendDot color={chartColorBlack500.value} />
            </FlexItem>
            <FlexItem>Reference</FlexItem>
          </Flex>
        </FlexItem>
        {curveLines.map((line, idx) => (
          <FlexItem key={line.label}>
            <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <ChartLegendDot color={COLOR_SCALE[idx % COLOR_SCALE.length]} />
              </FlexItem>
              <FlexItem>{line.label}</FlexItem>
            </Flex>
          </FlexItem>
        ))}
      </Flex>
    </div>
  );
};

export default ROCCurveChart;
