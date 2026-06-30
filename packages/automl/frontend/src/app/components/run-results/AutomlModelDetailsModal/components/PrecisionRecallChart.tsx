import React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import { Flex, FlexItem, Label, Title } from '@patternfly/react-core';
import type { CurvesData, PrecisionRecallEntry } from '~/app/types';
import {
  chartColorBlack500,
  CHART_PADDING,
  CHART_SIZE,
  CHART_WRAPPER_STYLE,
  COLOR_SCALE,
  TICK_VALUES,
  voronoiLabels,
} from './chartConstants';
import ChartLegendDot from './ChartLegendDot';

type CurveLineData = {
  label: string;
  ap: number;
  points: { name: string; x: number; y: number; index: number }[];
};

// Maps a PrecisionRecallEntry into chart-renderable points where x=recall, y=precision.
function buildLineFromEntry(
  entry: PrecisionRecallEntry,
  label: string,
  index: number,
): CurveLineData {
  return {
    label,
    ap: entry.average_precision,
    points: entry.recall.map((x, i) => ({
      name: `${label} recall: ${x.toFixed(3)}, precision: ${entry.precision[i].toFixed(3)}`,
      x,
      y: entry.precision[i],
      index,
    })),
  };
}

// Transforms CurvesData into chart-renderable line data.
// Binary: returns a single precision-recall curve.
// Multiclass: returns one curve per class.
export function buildPRCurveLines(prData: CurvesData): CurveLineData[] {
  if (prData.task_type === 'binary') {
    return [buildLineFromEntry(prData.precision_recall_curve, 'Model', 0)];
  }

  const { per_class: perClass } = prData.precision_recall_curve;
  return Object.entries(perClass).map(([className, entry], idx) =>
    buildLineFromEntry(entry, className, idx),
  );
}

// Returns the headline AP for the badge: single AP for binary, macro-average for multiclass.
function getApValue(prData: CurvesData): number {
  if (prData.task_type === 'binary') {
    return prData.precision_recall_curve.average_precision;
  }
  return prData.precision_recall_curve.average_precision_macro;
}

// Returns the baseline precision for the no-skill classifier line.
// Binary: single value. Multiclass: average across classes.
function getBaselinePrecision(prData: CurvesData): number {
  if (prData.task_type === 'binary') {
    return prData.precision_recall_curve.baseline_precision;
  }
  const entries = Object.values(prData.precision_recall_curve.per_class);
  return entries.reduce((sum, e) => sum + e.baseline_precision, 0) / entries.length;
}

type PrecisionRecallChartProps = {
  prData: CurvesData;
};

const BASELINE_STYLE = { data: { strokeDasharray: '6,4', stroke: chartColorBlack500.value } };

const PrecisionRecallChart: React.FC<PrecisionRecallChartProps> = ({ prData }) => {
  const curveLines = React.useMemo(() => buildPRCurveLines(prData), [prData]);
  const baseLineData = React.useMemo(() => {
    const bp = getBaselinePrecision(prData);
    return [
      { x: 0, y: bp, name: `No-skill baseline (${bp.toFixed(3)})` },
      { x: 1, y: bp, name: `No-skill baseline (${bp.toFixed(3)})` },
    ];
  }, [prData]);
  const ap = getApValue(prData);
  const isMulticlass = prData.task_type === 'multiclass';

  const chart = (
    <div style={CHART_WRAPPER_STYLE}>
      <Chart
        ariaDesc="Precision-Recall Curve"
        ariaTitle="Precision-Recall Curve"
        containerComponent={<ChartVoronoiContainer constrainToVisibleArea labels={voronoiLabels} />}
        height={CHART_SIZE}
        width={CHART_SIZE}
        padding={CHART_PADDING}
      >
        <ChartAxis showGrid dependentAxis label="Precision" tickValues={TICK_VALUES} />
        <ChartAxis showGrid label="Recall" tickValues={TICK_VALUES} />
        <ChartGroup>
          <ChartLine name="baseline" data={baseLineData} style={BASELINE_STYLE} />
          {curveLines.map((line, idx) => (
            <ChartLine
              key={line.label}
              data={line.points}
              interpolation="stepAfter"
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
  );

  return (
    <div data-testid="precision-recall-chart">
      <Flex alignItems={{ default: 'alignItemsCenter' }} className="pf-v6-u-mb-md">
        <Title headingLevel="h3" className="pf-v6-u-mr-sm">
          Precision-Recall Curve
        </Title>
        <Label isCompact>{`AP = ${ap.toFixed(3)}`}</Label>
      </Flex>
      {isMulticlass ? (
        <Flex>
          <FlexItem>{chart}</FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
            <div>
              {curveLines.map((line, idx) => (
                <Flex
                  key={line.label}
                  spaceItems={{ default: 'spaceItemsSm' }}
                  className="pf-v6-u-mb-sm"
                >
                  <FlexItem>
                    <ChartLegendDot color={COLOR_SCALE[idx % COLOR_SCALE.length]} />
                  </FlexItem>
                  <FlexItem>{line.label}</FlexItem>
                </Flex>
              ))}
            </div>
          </FlexItem>
        </Flex>
      ) : (
        <Flex justifyContent={{ default: 'justifyContentCenter' }}>
          <FlexItem>{chart}</FlexItem>
        </Flex>
      )}
    </div>
  );
};

export default PrecisionRecallChart;
