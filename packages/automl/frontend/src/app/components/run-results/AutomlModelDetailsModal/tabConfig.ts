import type React from 'react';
import type { TaskType, FeatureImportanceData, ConfusionMatrixData } from '~/app/types';
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

export type TabContentProps = {
  model: AutomlModel;
  taskType: TaskType;
  parameters?: Partial<ConfigureSchema>;
  createdAt?: string;
  featureImportance?: FeatureImportanceData;
  confusionMatrix?: ConfusionMatrixData;
  isArtifactsLoading?: boolean;
};

export type TabDefinition = {
  key: string;
  label: string;
  tooltip: string;
  section: 'Model viewer' | 'Evaluation';
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
    tooltip: "Overview of the model's experiment parameters and configuration",
    section: 'Model viewer',
    visibleFor: ALL_TASK_TYPES,
    component: ModelInformationTab,
  },
  {
    key: 'feature-summary',
    label: 'Feature summary',
    tooltip: 'Feature importance rankings based on permutation importance testing',
    section: 'Model viewer',
    visibleFor: NON_TIMESERIES_TYPES,
    component: FeatureSummaryTab,
  },
  {
    key: 'model-evaluation',
    label: 'Model evaluation',
    tooltip: 'Performance metrics measured on holdout test data',
    section: 'Evaluation',
    visibleFor: ALL_TASK_TYPES,
    component: ModelEvaluationTab,
  },
  {
    key: 'confusion-matrix',
    label: 'Confusion matrix',
    tooltip: 'Comparison of predicted vs. actual class labels',
    section: 'Evaluation',
    visibleFor: CLASSIFICATION_TYPES,
    component: ConfusionMatrixTab,
  },
];

export function getVisibleTabs(taskType: TaskType): TabDefinition[] {
  return TAB_DEFINITIONS.filter((tab) => tab.visibleFor.includes(taskType));
}
