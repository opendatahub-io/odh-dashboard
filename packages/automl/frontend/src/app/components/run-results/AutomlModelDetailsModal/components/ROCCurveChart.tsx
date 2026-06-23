import React from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLine,
  ChartVoronoiContainer,
} from '@patternfly/react-charts/victory';
import {
  chart_color_black_500 as chartColorBlack500,
  chart_theme_multi_color_ordered_ColorScale_100 as chartThemeColor100,
  chart_theme_multi_color_ordered_ColorScale_200 as chartThemeColor200,
  chart_theme_multi_color_ordered_ColorScale_300 as chartThemeColor300,
  chart_theme_multi_color_ordered_ColorScale_400 as chartThemeColor400,
  chart_theme_multi_color_ordered_ColorScale_500 as chartThemeColor500,
} from '@patternfly/react-tokens';
import { Flex, FlexItem, Label, Title } from '@patternfly/react-core';
import type { CurvesData, RocCurveEntry } from '~/app/types';

const COLOR_SCALE = [
  chartThemeColor100.value,
  chartThemeColor200.value,
  chartThemeColor300.value,
  chartThemeColor400.value,
  chartThemeColor500.value,
];

type CurveLineData = {
  label: string;
  auc: number;
  points: { name: string; x: number; y: number; index: number }[];
};

// Maps a single RocCurveEntry (fpr/tpr arrays) into chart-renderable points where x=FPR, y=TPR.
function buildCurveLineFromEntry(
  entry: RocCurveEntry,
  label: string,
  index: number,
): CurveLineData {
  return {
    label,
    auc: entry.auc,
    points: entry.fpr.map((x, i) => ({
      name: `${label} threshold: ${String(entry.thresholds[i])}`,
      x,
      y: entry.tpr[i],
      index,
    })),
  };
}

// Computes the macro-averaged ROC curve. Per-class curves have different FPR sample points,
// so we interpolate each onto 101 evenly spaced FPR values (0.00, 0.01, ..., 1.00) and
// average the TPR across all classes at each point.
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
      let interpolatedTpr = 0;
      for (let j = 0; j < fpr.length - 1; j++) {
        if (fprVal >= fpr[j] && fprVal <= fpr[j + 1]) {
          const range = fpr[j + 1] - fpr[j];
          const t = range === 0 ? 0 : (fprVal - fpr[j]) / range;
          interpolatedTpr = tpr[j] + t * (tpr[j + 1] - tpr[j]);
          break;
        }
      }
      if (fprVal >= fpr[fpr.length - 1]) {
        interpolatedTpr = tpr[tpr.length - 1];
      }
      return sum + interpolatedTpr;
    }, 0);
    return tprSum / entries.length;
  });

  return {
    label: 'Multi-class',
    auc: aucMacro,
    points: commonFpr.map((x, i) => ({
      name: `Multi-class FPR: ${x.toFixed(2)}, TPR: ${avgTpr[i].toFixed(3)}`,
      x,
      y: avgTpr[i],
      index,
    })),
  };
}

// Transforms CurvesData into chart-renderable line data.
// Binary: returns a single ROC curve.
// Multiclass: returns one "ClassName (One v. Rest)" curve per class plus a macro-averaged curve.
export function buildCurveLines(rocCurveData: CurvesData): CurveLineData[] {
  if (rocCurveData.task_type === 'binary') {
    return [buildCurveLineFromEntry(rocCurveData.roc_curve, 'ROC', 0)];
  }

  const { per_class: perClass, auc_macro: aucMacro } = rocCurveData.roc_curve;
  const classLines = Object.entries(perClass).map(([className, entry], idx) =>
    buildCurveLineFromEntry(entry, `${className} (One v. Rest)`, idx),
  );
  const macroLine = buildMacroAverageCurve(perClass, aucMacro, classLines.length);
  return [...classLines, macroLine];
}

// Returns the headline AUC for the badge: single AUC for binary, macro-average for multiclass.
function getAucValue(rocCurveData: CurvesData): number {
  if (rocCurveData.task_type === 'binary') {
    return rocCurveData.roc_curve.auc;
  }
  return rocCurveData.roc_curve.auc_macro;
}

type ROCCurveChartProps = {
  rocCurveData: CurvesData;
};

const CHART_SIZE = 500;

const ROCCurveChart: React.FC<ROCCurveChartProps> = ({ rocCurveData }) => {
  const curveLines = React.useMemo(() => buildCurveLines(rocCurveData), [rocCurveData]);
  const baseLineData = React.useMemo(
    () =>
      Array.from({ length: 101 }, (_, i) => ({
        x: i / 100,
        y: i / 100,
        name: `Reference (random classifier)`,
      })),
    [],
  );
  const auc = getAucValue(rocCurveData);
  const isMulticlass = rocCurveData.task_type === 'multiclass';

  const chart = (
    <div style={{ width: CHART_SIZE }}>
      <Chart
        ariaDesc="ROC Curve"
        ariaTitle="ROC Curve"
        containerComponent={
          <ChartVoronoiContainer constrainToVisibleArea labels={({ datum }) => datum.name} />
        }
        height={CHART_SIZE}
        width={CHART_SIZE}
        padding={{ bottom: 60, left: 80, right: 50, top: 20 }}
      >
        <ChartAxis
          showGrid
          dependentAxis
          label="True positive rate (sensitivity)"
          tickValues={Array.from({ length: 11 }, (_, i) => i / 10)}
        />
        <ChartAxis
          showGrid
          label="False positive rate (1-specificity)"
          tickValues={Array.from({ length: 11 }, (_, i) => i / 10)}
        />
        <ChartGroup>
          <ChartLine
            name="baseline"
            data={baseLineData}
            style={{
              data: {
                strokeDasharray: '3,3',
                stroke: chartColorBlack500.value,
              },
            }}
          />
          {curveLines.map((line, idx) => (
            <ChartLine
              key={line.label}
              data={line.points}
              interpolation="basis"
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
    <div data-testid="roc-curve-chart">
      <div className="pf-v6-u-mb-md pf-v6-u-display-flex pf-v6-u-align-items-center">
        <Title headingLevel="h3" className="pf-v6-u-mr-sm">
          ROC Curve
        </Title>
        <Label isCompact>{`AUC = ${auc.toFixed(3)}`}</Label>
      </div>
      {isMulticlass ? (
        <Flex>
          <FlexItem>{chart}</FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
            <div>
              <Flex spaceItems={{ default: 'spaceItemsSm' }} className="pf-v6-u-mb-sm">
                <FlexItem>
                  <svg width="12" height="12">
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      fill="none"
                      stroke={chartColorBlack500.value}
                      strokeWidth="2"
                    />
                  </svg>
                </FlexItem>
                <FlexItem>Reference</FlexItem>
              </Flex>
              {curveLines.map((line, idx) => (
                <Flex
                  key={line.label}
                  spaceItems={{ default: 'spaceItemsSm' }}
                  className="pf-v6-u-mb-sm"
                >
                  <FlexItem>
                    <svg width="12" height="12">
                      <circle
                        cx="6"
                        cy="6"
                        r="5"
                        fill="none"
                        stroke={COLOR_SCALE[idx % COLOR_SCALE.length]}
                        strokeWidth="2"
                      />
                    </svg>
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

export default ROCCurveChart;
