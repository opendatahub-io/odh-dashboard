import {
  ChartBarIcon,
  CommentsIcon,
  CubeIcon,
  DatabaseIcon,
  EqualizerIcon,
  InfrastructureIcon,
  RhUiAiModelIcon,
  RhUiDistributeIcon,
  RhUiInstallIcon,
  RhUiMonitoringIcon,
  SearchIcon,
  StarIcon,
} from '@patternfly/react-icons';
import {
  DEFAULT_TASK_ICON,
  MODEL_BRANCH_TASK_ICON,
  resolveTaskIconForNodeId,
  STAGE_TASK_ICONS,
  STEP_TASK_ICONS,
} from '~/app/topology/tree-view/stageTaskIcons';

describe('resolveTaskIconForNodeId', () => {
  it('maps Figma AutoML stage IDs to RH UI / PatternFly icons', () => {
    expect(resolveTaskIconForNodeId('data_prep__prepare_data')).toBe(RhUiInstallIcon);
    expect(resolveTaskIconForNodeId('data_prep__split_and_export')).toBe(DatabaseIcon);
    expect(resolveTaskIconForNodeId('training__load_data')).toBe(SearchIcon);
    expect(resolveTaskIconForNodeId('training__model_selection')).toBe(RhUiDistributeIcon);
    expect(resolveTaskIconForNodeId('training__refit_full')).toBe(RhUiMonitoringIcon);
    expect(resolveTaskIconForNodeId('training__refit_and_evaluate')).toBe(RhUiMonitoringIcon);
    expect(resolveTaskIconForNodeId('training__build_leaderboard')).toBe(StarIcon);
  });

  it('maps branch step IDs including evaluation aliases', () => {
    expect(resolveTaskIconForNodeId('training__step__feature_engineering__branch-0')).toBe(
      ChartBarIcon,
    );
    expect(resolveTaskIconForNodeId('training__step__model_training__branch-0')).toBe(
      EqualizerIcon,
    );
    expect(resolveTaskIconForNodeId('training__step__stacking__branch-0')).toBe(InfrastructureIcon);
    expect(resolveTaskIconForNodeId('training__step__evaluation__branch-0')).toBe(CommentsIcon);
    expect(resolveTaskIconForNodeId('training__step__model_evaluation__branch-1')).toBe(
      CommentsIcon,
    );
    expect(resolveTaskIconForNodeId('training__branch-0__step__feature_engineering')).toBe(
      ChartBarIcon,
    );
    expect(resolveTaskIconForNodeId('training__branch-0__step__model_training')).toBe(
      EqualizerIcon,
    );
    expect(resolveTaskIconForNodeId('training__branch-0__step__stacking')).toBe(InfrastructureIcon);
    expect(resolveTaskIconForNodeId('training__branch-0__step__evaluation')).toBe(CommentsIcon);
    expect(resolveTaskIconForNodeId('training__branch-1__step__model_evaluation')).toBe(
      CommentsIcon,
    );
  });

  it('uses RH UI ai-model icon for model branch terminus nodes', () => {
    expect(resolveTaskIconForNodeId('training__model__branch-0')).toBe(MODEL_BRANCH_TASK_ICON);
    expect(MODEL_BRANCH_TASK_ICON).toBe(RhUiAiModelIcon);
  });

  it('falls back for unknown IDs', () => {
    expect(resolveTaskIconForNodeId('training__unknown_stage')).toBe(DEFAULT_TASK_ICON);
    expect(resolveTaskIconForNodeId('not-a-node-id')).toBe(DEFAULT_TASK_ICON);
    expect(DEFAULT_TASK_ICON).toBe(CubeIcon);
  });

  it('falls back for inherited object keys on stage and step lookups', () => {
    expect(resolveTaskIconForNodeId('training__toString')).toBe(DEFAULT_TASK_ICON);
    expect(resolveTaskIconForNodeId('training__step__toString__branch-0')).toBe(DEFAULT_TASK_ICON);
  });

  it('exposes maps aligned to Figma rh-ui names', () => {
    expect(STAGE_TASK_ICONS.prepare_data).toBe(RhUiInstallIcon);
    expect(STAGE_TASK_ICONS.refit_and_evaluate).toBe(RhUiMonitoringIcon);
    expect(STAGE_TASK_ICONS.refit_full).toBe(RhUiMonitoringIcon);
    expect(STEP_TASK_ICONS.evaluation).toBe(CommentsIcon);
  });
});
