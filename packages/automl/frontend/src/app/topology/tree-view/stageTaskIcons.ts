// AutoML stage/step task icons (RH UI preferred; PF stand-ins where needed).
import type { ComponentType } from 'react';
import {
  ChartBarIcon,
  CommentsIcon,
  CubeIcon,
  DatabaseIcon,
  EqualizerIcon,
  InfrastructureIcon,
  RhUiAiModelIcon,
  RhUiDistributeIcon,
  RhUiGearGroupIcon,
  RhUiInstallIcon,
  RhUiMonitoringIcon,
  SearchIcon,
  StarIcon,
} from '@patternfly/react-icons';
import type { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { parseStageMapNodeId } from './stageMapStepMetadata';

export type TaskIconComponent = ComponentType<SVGIconProps>;

/* eslint-disable camelcase -- keys match backend stage / step IDs */
/** Figma: prepare/split/load/select/refit/leaderboard (+ related aliases). */
export const STAGE_TASK_ICONS: Record<string, TaskIconComponent> = {
  validate_inputs: RhUiInstallIcon,
  read_and_sample: RhUiInstallIcon, // rh-ui-icon-install
  prepare_data: RhUiInstallIcon, // rh-ui-icon-install
  cleanse: RhUiGearGroupIcon, // rh-ui-icon-gear-group
  split: DatabaseIcon, // rh-ui-icon-storage
  split_and_export: DatabaseIcon, // rh-ui-icon-storage
  write_outputs: RhUiInstallIcon,
  load_data: SearchIcon, // rh-ui-icon-search
  model_selection: RhUiDistributeIcon, // rh-ui-icon-distribute
  // Production stage maps use refit_and_evaluate; refit_full is a legacy/test alias.
  refit_and_evaluate: RhUiMonitoringIcon, // rh-ui-icon-monitoring
  refit_full: RhUiMonitoringIcon, // rh-ui-icon-monitoring
  evaluate_models: CommentsIcon, // rh-ui-icon-comments (score)
  build_leaderboard: StarIcon, // rh-ui-icon-star-fill
};

// Branch step glyphs (chunking, engineer features, train model, …).
export const STEP_TASK_ICONS: Record<string, TaskIconComponent> = {
  feature_engineering: ChartBarIcon,
  model_training: EqualizerIcon,
  stacking: InfrastructureIcon,
  model_evaluation: CommentsIcon, // rh-ui-icon-comments (score model)
  evaluation: CommentsIcon,
};
/* eslint-enable camelcase */

export const DEFAULT_TASK_ICON: TaskIconComponent = CubeIcon;
/** Figma: rh-ui-icon-ai-model — model-name branch terminus / winner. */
export const MODEL_BRANCH_TASK_ICON: TaskIconComponent = RhUiAiModelIcon;

export const resolveTaskIconForNodeId = (nodeId: string): TaskIconComponent => {
  const parsed = parseStageMapNodeId(nodeId);
  if (!parsed) {
    return DEFAULT_TASK_ICON;
  }
  if (parsed.type === 'stage') {
    return Object.hasOwn(STAGE_TASK_ICONS, parsed.stageId)
      ? STAGE_TASK_ICONS[parsed.stageId]
      : DEFAULT_TASK_ICON;
  }
  if (parsed.type === 'branch_step') {
    return Object.hasOwn(STEP_TASK_ICONS, parsed.stepId)
      ? STEP_TASK_ICONS[parsed.stepId]
      : DEFAULT_TASK_ICON;
  }
  return MODEL_BRANCH_TASK_ICON;
};
