import React from 'react';
import type { CurvesData, PrecisionRecallEntry } from '~/app/types';
import { chartColorBlack500 } from './chartConstants';
import EvaluationCurveChart, { buildCurveLine, type CurveLine } from './EvaluationCurveChart';

type CurveLineData = CurveLine & { ap: number };

function buildLineFromEntry(
  entry: PrecisionRecallEntry,
  label: string,
  index: number,
): CurveLineData {
  return {
    ...buildCurveLine(entry.recall, entry.precision, label, index),
    ap: entry.average_precision,
  };
}

export function buildPRCurveLines(prData: CurvesData): CurveLineData[] {
  if (prData.task_type === 'binary') {
    return [buildLineFromEntry(prData.precision_recall_curve, 'Model', 0)];
  }
  const { per_class: perClass } = prData.precision_recall_curve;
  return Object.entries(perClass).map(([className, entry], idx) =>
    buildLineFromEntry(entry, className, idx),
  );
}

export function getApValue(prData: CurvesData): number {
  if (prData.task_type === 'binary') {
    return prData.precision_recall_curve.average_precision;
  }
  return prData.precision_recall_curve.average_precision_macro;
}

// A no-skill classifier that always predicts positive achieves precision = class prevalence.
export function getBaselinePrecision(prData: CurvesData): number {
  if (prData.task_type === 'binary') {
    return prData.precision_recall_curve.baseline_precision;
  }
  const entries = Object.values(prData.precision_recall_curve.per_class);
  return entries.reduce((sum, e) => sum + e.baseline_precision, 0) / entries.length;
}

type PrecisionRecallChartProps = {
  prData: CurvesData;
};

const BASELINE_STYLE = {
  data: { strokeDasharray: '6,4', stroke: chartColorBlack500.value, strokeWidth: 1 },
};

const PrecisionRecallChart: React.FC<PrecisionRecallChartProps> = ({ prData }) => {
  const curveLines = React.useMemo(() => buildPRCurveLines(prData), [prData]);
  const baselineData = React.useMemo(() => {
    const bp = getBaselinePrecision(prData);
    return [
      { x: 0, y: bp, name: `No-skill baseline (${bp.toFixed(3)})` },
      { x: 1, y: bp, name: `No-skill baseline (${bp.toFixed(3)})` },
    ];
  }, [prData]);

  return (
    <EvaluationCurveChart
      curveLines={curveLines}
      baselineData={baselineData}
      baselineStyle={BASELINE_STYLE}
      xAxisLabel="Recall"
      yAxisLabel="Precision"
      xMetricLabel="Recall"
      yMetricLabel="Precision"
      interpolation="monotoneX"
      data-testid="precision-recall-chart"
    />
  );
};

export default PrecisionRecallChart;
