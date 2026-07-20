import type { PipelineStatusFilter } from '~/app/topology/tree-view/types';
import {
  getDefaultStatusFilter,
  getPipelineDetailsEmptyContent,
  getPipelineStatusFilterLabel,
  getPipelineTreeLoadingContent,
  mapPipelineStatusToLabelAppearance,
  type PipelineTreeLoadingMode,
} from '~/app/components/run-results/pipelineStatusLabels';

describe('getDefaultStatusFilter', () => {
  it('maps recognized progress and terminal states', () => {
    expect(getDefaultStatusFilter('RUNNING')).toBe('in-progress');
    expect(getDefaultStatusFilter('PENDING')).toBe('in-progress');
    expect(getDefaultStatusFilter('PAUSED')).toBe('in-progress');
    expect(getDefaultStatusFilter('CANCELING')).toBe('in-progress');
    expect(getDefaultStatusFilter('SUCCEEDED')).toBe('completed');
    expect(getDefaultStatusFilter('FAILED')).toBe('error');
    expect(getDefaultStatusFilter('CANCELED')).toBe('canceled');
  });

  it('trims whitespace before matching recognized states', () => {
    expect(getDefaultStatusFilter('  running  ')).toBe('in-progress');
    expect(getDefaultStatusFilter('\tsucceeded\n')).toBe('completed');
  });

  it('falls back to loading for missing or unrecognized states', () => {
    expect(getDefaultStatusFilter(undefined)).toBe('loading');
    expect(getDefaultStatusFilter('')).toBe('loading');
    expect(getDefaultStatusFilter('   ')).toBe('loading');
    expect(getDefaultStatusFilter('not-a-state')).toBe('loading');
  });
});

describe('getPipelineStatusFilterLabel', () => {
  it('should show a running label for in-progress status', () => {
    expect(getPipelineStatusFilterLabel('in-progress')).toEqual({
      text: 'Running',
      color: 'blue',
    });
  });

  it('should show a canceled label distinct from failed', () => {
    expect(getPipelineStatusFilterLabel('canceled')).toEqual({
      text: 'Canceled',
      status: 'warning',
    });
  });

  it('should show a failed label', () => {
    expect(getPipelineStatusFilterLabel('error')).toEqual({
      text: 'Failed',
      status: 'danger',
    });
  });
});

describe('pipeline status label fallbacks', () => {
  it('falls back to hydrating loading content for an unmapped tree loading mode', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const unknownMode = 'unknown' as PipelineTreeLoadingMode;
    expect(getPipelineTreeLoadingContent(unknownMode)).toEqual({
      title: 'Loading run details',
      primaryText: 'Loading run details',
      secondaryText:
        'The pipeline visualization will appear once the current run data is retrieved.',
    });
  });

  it('returns a safe purple appearance for an unmapped pipeline status', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const unknownStatus = 'unknown' as PipelineStatusFilter;
    expect(mapPipelineStatusToLabelAppearance(unknownStatus)).toEqual({ color: 'purple' });
  });

  it('returns a generic filter label for an unmapped pipeline status', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const unknownStatus = 'unknown' as PipelineStatusFilter;
    expect(getPipelineStatusFilterLabel(unknownStatus)).toEqual({
      text: 'Loading',
      color: 'blue',
    });
  });

  it('returns a generic idle empty state for an unmapped pipeline status', () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const unknownStatus = 'unknown' as PipelineStatusFilter;
    expect(getPipelineDetailsEmptyContent(unknownStatus)).toEqual({
      title: 'Pipeline details',
      variant: 'idle',
      secondaryText: 'Click on any node in the pipeline to view its details here.',
    });
  });
});
