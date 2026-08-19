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
import {
  DEFAULT_TASK_ICON,
  PATTERN_BRANCH_TASK_ICON,
  resolveTaskIconForNodeId,
  STAGE_TASK_ICONS,
  STEP_TASK_ICONS,
} from '~/app/topology/tree-view/stageTaskIcons';

describe('resolveTaskIconForNodeId', () => {
  it('maps Figma AutoRAG stage IDs to RH UI icons', () => {
    expect(resolveTaskIconForNodeId('loader__load_benchmark')).toBe(RhUiInstallIcon);
    expect(resolveTaskIconForNodeId('docs__discover_documents')).toBe(OutlinedFileAltIcon);
    expect(resolveTaskIconForNodeId('docs__extract_documents')).toBe(SearchIcon);
    expect(resolveTaskIconForNodeId('search__prepare_search_space')).toBe(RhUiGearGroupIcon);
    expect(resolveTaskIconForNodeId('opt__optimize_templates')).toBe(RhUiDistributeIcon);
    expect(resolveTaskIconForNodeId('final__build_leaderboard')).toBe(StarIcon);
  });

  it('maps branch step IDs to Figma-aligned stand-ins', () => {
    expect(resolveTaskIconForNodeId('rag__step__chunking__branch-0')).toBe(InfrastructureIcon);
    expect(resolveTaskIconForNodeId('rag__branch-0__step__chunking')).toBe(InfrastructureIcon);
    expect(resolveTaskIconForNodeId('rag__step__embedding__branch-0')).toBe(RegistryIcon);
    expect(resolveTaskIconForNodeId('rag__step__retrieval__branch-0')).toBe(FilterIcon);
    expect(resolveTaskIconForNodeId('rag__step__generation__branch-0')).toBe(CommentsIcon);
    expect(resolveTaskIconForNodeId('rag__step__evaluation__branch-0')).toBe(MonitoringIcon);
  });

  it('uses template icon for pattern branch terminus nodes', () => {
    expect(resolveTaskIconForNodeId('rag__pattern__branch-0')).toBe(PATTERN_BRANCH_TASK_ICON);
    expect(PATTERN_BRANCH_TASK_ICON).toBe(PficonTemplateIcon);
  });

  it('falls back for unknown IDs', () => {
    expect(resolveTaskIconForNodeId('rag__unknown_stage')).toBe(DEFAULT_TASK_ICON);
    expect(resolveTaskIconForNodeId('not-a-node-id')).toBe(DEFAULT_TASK_ICON);
    expect(DEFAULT_TASK_ICON).toBe(CubeIcon);
  });

  it('falls back for inherited object keys on stage and step lookups', () => {
    expect(resolveTaskIconForNodeId('rag__toString')).toBe(DEFAULT_TASK_ICON);
    expect(resolveTaskIconForNodeId('rag__step__toString__branch-0')).toBe(DEFAULT_TASK_ICON);
  });

  it('exposes maps aligned to Figma rh-ui names', () => {
    expect(STAGE_TASK_ICONS.load_benchmark).toBe(RhUiInstallIcon);
    expect(STAGE_TASK_ICONS.prepare_search_space).toBe(RhUiGearGroupIcon);
    expect(STAGE_TASK_ICONS.optimize_templates).toBe(RhUiDistributeIcon);
    expect(STEP_TASK_ICONS.chunking).toBe(InfrastructureIcon);
  });
});
