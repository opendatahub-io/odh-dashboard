import type React from 'react';
import type { TaskType, FeatureImportanceData, ConfusionMatrixData, CurvesData } from '~/app/types';
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
import PrecisionRecallTab from './tabs/PrecisionRecallTab';

export type TabContentProps = {
  model: AutomlModel;
  taskType: TaskType;
  parameters?: Partial<ConfigureSchema>;
  createdAt?: string;
  featureImportance?: FeatureImportanceData;
  confusionMatrix?: ConfusionMatrixData;
  curves?: CurvesData;
  isArtifactsLoading?: boolean;
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
      'Holdout scores reflect performance on data excluded from training. Classification metrics appear in the measures table. The ROC curve shows class separation across thresholds; AUC summarizes overall ranking quality.',
    description:
      'Summarizes how well the model separates classes on holdout data using the ROC curve and core classification metrics.',
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
      'Compares actual and predicted class labels to show correct predictions and misclassifications.',
    section: 'Evaluation',
    visibleFor: CLASSIFICATION_TYPES,
    component: ConfusionMatrixTab,
  },
  {
    key: 'precision-recall',
    label: 'Precision recall',
    tooltip: 'Precision-recall curve showing the trade-off between precision and recall',
    section: 'Evaluation',
    visibleFor: CLASSIFICATION_TYPES,
    component: PrecisionRecallTab,
  },
];

export function getVisibleTabs(taskType: TaskType): TabDefinition[] {
  return TAB_DEFINITIONS.filter((tab) => tab.visibleFor.includes(taskType));
}
