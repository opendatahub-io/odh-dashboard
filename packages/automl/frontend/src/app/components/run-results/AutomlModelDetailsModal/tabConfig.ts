import type React from 'react';
import type {
  TaskType,
  FeatureImportanceData,
  ConfusionMatrixData,
  CurvesData,
  BackTestingData,
} from '~/app/types';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from '~/app/utilities/const';
import ModelInformationTab from './tabs/ModelInformationTab';
import FeatureSummaryTab from './tabs/FeatureSummaryTab';
import ModelEvaluationTab from './tabs/ModelEvaluationTab';
import ConfusionMatrixTab from './tabs/ConfusionMatrixTab';
import ROCCurveTab from './tabs/ROCCurveTab';
import PrecisionRecallTab from './tabs/PrecisionRecallTab';
import BacktestingTab from './tabs/BacktestingTab';

export type TabContentProps = {
  // Model 'download' (print-to-pdf) feature; `print` prop is `true` when a tab component is rendered in the PDF content allowing custom rendering if needed.
  print?: boolean;
  model: AutomlModel;
  taskType: TaskType;
  parameters?: Partial<ConfigureSchema>;
  createdAt?: string;
  featureImportance?: FeatureImportanceData;
  confusionMatrix?: ConfusionMatrixData;
  curves?: CurvesData;
  backTesting?: BackTestingData;
  isArtifactsLoading?: boolean;
  backtestSelectedMetrics?: string[];
  onBacktestMetricsChange?: (metrics: string[]) => void;
};

export type TabDefinition = {
  key: string;
  label: string;
  tooltip: string;
  description?: string;
  section: 'Model configuration' | 'Evaluation';
  visibleFor: readonly TaskType[];
  component: React.ComponentType<TabContentProps>;
};

const ALL_TASK_TYPES: readonly TaskType[] = [
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
];

const NON_TIMESERIES_TYPES: readonly TaskType[] = [
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
];

const CLASSIFICATION_TYPES: readonly TaskType[] = [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS];

export const TAB_DEFINITIONS: TabDefinition[] = [
  {
    key: 'model-information',
    label: 'Model information',
    tooltip:
      'Use this tab to confirm how the experiment was configured — preset quality, top-N leaderboard size, label column, prediction length, and the metric used to rank models.',
    description:
      'Summarizes experiment configuration for this model: preset, label column, evaluation metric, and creation metadata.',
    section: 'Model configuration',
    visibleFor: ALL_TASK_TYPES,
    component: ModelInformationTab,
  },
  {
    key: 'feature-summary',
    label: 'Feature summary',
    tooltip:
      'Search and sort features by name or importance. Importance reflects relative influence on the model output after preprocessing.',
    description:
      'Shows how each input feature contributes to predictions, ranked by relative importance.',
    section: 'Model configuration',
    visibleFor: NON_TIMESERIES_TYPES,
    component: FeatureSummaryTab,
  },
  {
    key: 'model-evaluation',
    label: 'Model evaluation',
    tooltip:
      'Holdout scores reflect performance on data excluded from training. Each metric is measured on a held-out test set not seen during training.',
    description: 'Performance metrics measured on holdout test data.',
    section: 'Evaluation',
    visibleFor: ALL_TASK_TYPES,
    component: ModelEvaluationTab,
  },
  {
    key: 'confusion-matrix',
    label: 'Confusion matrix',
    tooltip:
      'Each cell counts how often the model predicted a class (columns) for a given actual class (rows). Diagonal cells are correct predictions; off-diagonal cells are errors. Use this view to see whether the model confuses specific classes.',
    description:
      'Compares actual and predicted class labels to show where the model is correct and which classes it confuses.',
    section: 'Evaluation',
    visibleFor: CLASSIFICATION_TYPES,
    component: ConfusionMatrixTab,
  },
  {
    key: 'roc-curve',
    label: 'Receiver Operating Characteristic',
    tooltip:
      'ROC (Receiver Operating Characteristic) shows how well the model separates classes as the decision threshold changes. The x-axis is false positive rate (1 − specificity); the y-axis is true positive rate (sensitivity). AUC (area under the curve) summarizes ranking quality on holdout data — 1.0 is perfect separation; 0.5 matches random guessing.',
    description:
      'Plots true positive rate against false positive rate at each classification threshold.',
    section: 'Evaluation',
    visibleFor: CLASSIFICATION_TYPES,
    component: ROCCurveTab,
  },
  {
    key: 'precision-recall',
    label: 'Precision recall',
    tooltip:
      'Precision is the share of positive predictions that are correct. Recall is the share of actual positives the model finds. Average precision (AP) summarizes the precision-recall curve and is especially useful for imbalanced datasets.',
    description:
      'Shows the trade-off between precision and recall as the classification threshold changes.',
    section: 'Evaluation',
    visibleFor: CLASSIFICATION_TYPES,
    component: PrecisionRecallTab,
  },
  {
    key: 'backtest-window',
    label: 'Backtest window',
    tooltip:
      'Back-testing scores the model on rolling validation windows before evaluating the final holdout set. Overall metrics summarize performance across all backtest windows. The holdout point in the chart shows error on data excluded from training.',
    description:
      'Evaluates time series forecast quality across rolling validation windows and a final holdout period.',
    section: 'Evaluation',
    visibleFor: [TASK_TYPE_TIMESERIES],
    component: BacktestingTab,
  },
];

export function getVisibleTabs(taskType: TaskType): TabDefinition[] {
  return TAB_DEFINITIONS.filter((tab) => tab.visibleFor.includes(taskType));
}
