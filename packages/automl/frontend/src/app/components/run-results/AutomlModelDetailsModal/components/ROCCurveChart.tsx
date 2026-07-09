import React from 'react';
import type { CurvesData, RocCurveEntry } from '~/app/types';
import { chartColorBlack500 } from './chartConstants';
import EvaluationCurveChart, { buildCurveLine, type CurveLine } from './EvaluationCurveChart';

type CurveLineData = CurveLine & { auc: number };

function buildCurveLineFromEntry(
  entry: RocCurveEntry,
  label: string,
  index: number,
): CurveLineData {
  return {
    ...buildCurveLine(entry.fpr, entry.tpr, label, index),
    auc: entry.auc,
  };
}

// Per-class ROC curves have different FPR arrays (different lengths and x-values),
// so we can't average them directly. Instead, define a common 101-point FPR grid
// and linearly interpolate each class's TPR onto it before averaging.
export function buildMacroAverageCurve(
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

// Diagonal y=x line: a random classifier has TPR equal to FPR at every threshold.
const BASELINE_STYLE = { data: { strokeDasharray: '3,3', stroke: chartColorBlack500.value } };
const BASELINE_DATA = Array.from({ length: 101 }, (_, i) => ({
  x: i / 100,
  y: i / 100,
  name: 'Reference (random classifier)',
}));

const ROCCurveChart: React.FC<ROCCurveChartProps> = ({ rocCurveData }) => {
  const curveLines = React.useMemo(() => buildCurveLines(rocCurveData), [rocCurveData]);

  return (
    <EvaluationCurveChart
      curveLines={curveLines}
      baselineData={BASELINE_DATA}
      baselineStyle={BASELINE_STYLE}
      xAxisLabel="False positive rate (FPR)"
      yAxisLabel="True positive rate (TPR)"
      xMetricLabel="FPR"
      yMetricLabel="TPR"
      interpolation="monotoneX"
      data-testid="roc-curve-chart"
    />
  );
};

export default ROCCurveChart;
