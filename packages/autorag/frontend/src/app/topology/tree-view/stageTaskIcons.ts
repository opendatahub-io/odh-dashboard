// AutoRAG stage/step task icons (RH UI preferred; PF stand-ins where needed).
import type { ComponentType } from 'react';
import {
  CommentsIcon,
  CubeIcon,
  FilterIcon,
  InfrastructureIcon,
  MonitoringIcon,
  OutlinedFileAltIcon,
  PficonTemplateIcon,
  RegistryIcon,
  RhUiDistributeIcon,
  RhUiGearGroupIcon,
  RhUiInstallIcon,
  SearchIcon,
  StarIcon,
} from '@patternfly/react-icons';
import type { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { parseStageMapNodeId } from './stageMapStepMetadata';

export type TaskIconComponent = ComponentType<SVGIconProps>;

/* eslint-disable camelcase -- keys match backend stage / step IDs */
export const STAGE_TASK_ICONS: Record<string, TaskIconComponent> = {
  validate_inputs: RhUiInstallIcon,
  download_and_sample: RhUiInstallIcon, // rh-ui-icon-install
  prepare_data: RhUiGearGroupIcon, // rh-ui-icon-gear-group
  write_output: RhUiInstallIcon,
  list_and_sample: OutlinedFileAltIcon, // rh-ui-icon-resource
  write_descriptor: OutlinedFileAltIcon,
  load_descriptor: SearchIcon,
  load_benchmark: RhUiInstallIcon, // rh-ui-icon-install
  discover_documents: OutlinedFileAltIcon, // rh-ui-icon-resource
  extract_documents: SearchIcon, // rh-ui-icon-search
  prepare_search_space: RhUiGearGroupIcon, // rh-ui-icon-gear-group
  write_report: OutlinedFileAltIcon,
  optimize_templates: RhUiDistributeIcon, // rh-ui-icon-distribute
  run_optimization: RhUiDistributeIcon,
  write_patterns: PficonTemplateIcon,
  build_requests: CommentsIcon,
  write_artifacts: InfrastructureIcon,
  build_leaderboard: StarIcon, // rh-ui-icon-star-fill / Select best pattern
};

export const STEP_TASK_ICONS: Record<string, TaskIconComponent> = {
  chunking: InfrastructureIcon, // rh-ui-icon-infrastructure
  embedding: RegistryIcon, // rh-ui-icon-registry
  retrieval: FilterIcon, // rh-ui-icon-filter
  generation: CommentsIcon, // rh-ui-icon-comments
  evaluation: MonitoringIcon, // rh-ui-icon-analyze (score pattern)
};
/* eslint-enable camelcase */

export const DEFAULT_TASK_ICON: TaskIconComponent = CubeIcon;
/** Figma: rh-ui-icon-template — pattern branch terminus (Pattern winner). */
export const PATTERN_BRANCH_TASK_ICON: TaskIconComponent = PficonTemplateIcon;

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
  return PATTERN_BRANCH_TASK_ICON;
};
