/* eslint-disable camelcase -- PipelineRunTaskDetail fields mirror the KFP API's snake_case */
import type { PipelineRunTaskDetail } from '../../../api/pipelines/types';
import {
  componentIdToTaskId,
  findComponentTaskInRunDetails,
  findComponentTasksInRunDetails,
  findFirstFailedTaskKey,
  findTaskDirPrefix,
  isKfpDriverTaskName,
  matchesComponentTaskName,
} from '../taskMatching';

const task = (overrides: Partial<PipelineRunTaskDetail>): PipelineRunTaskDetail => ({
  task_id: 'task-id',
  ...overrides,
});

describe('componentIdToTaskId', () => {
  it('should convert underscores to hyphens', () => {
    expect(componentIdToTaskId('documents_discovery')).toBe('documents-discovery');
  });

  it('should leave hyphenated ids unchanged', () => {
    expect(componentIdToTaskId('documents-discovery')).toBe('documents-discovery');
  });
});

describe('matchesComponentTaskName', () => {
  it('should match the base task name', () => {
    expect(matchesComponentTaskName('documents-discovery', 'documents_discovery')).toBe(true);
  });

  it('should match a KFP branch numeric suffix variant', () => {
    expect(matchesComponentTaskName('documents-discovery-2', 'documents_discovery')).toBe(true);
  });

  it('should not match non-numeric suffixes', () => {
    expect(matchesComponentTaskName('documents-discovery-driver', 'documents_discovery')).toBe(
      false,
    );
    expect(matchesComponentTaskName('documents-discovery-x', 'documents_discovery')).toBe(false);
  });

  it('should not match unrelated names', () => {
    expect(matchesComponentTaskName('another-task', 'documents_discovery')).toBe(false);
  });
});

describe('isKfpDriverTaskName', () => {
  it('should detect driver tasks', () => {
    expect(isKfpDriverTaskName('documents-discovery-driver')).toBe(true);
  });

  it('should not flag executor tasks', () => {
    expect(isKfpDriverTaskName('documents-discovery')).toBe(false);
    expect(isKfpDriverTaskName('documents-discovery-2')).toBe(false);
  });
});

describe('findComponentTaskInRunDetails', () => {
  it('should match by display_name when task_id is a UUID', () => {
    const details = [
      task({
        task_id: '0d709ceb-88b7-4e82-ab5b-ddc7d23da85b',
        display_name: 'documents-discovery',
      }),
      task({ task_id: 'another-uuid', display_name: 'vector-db-setup' }),
    ];
    expect(findComponentTaskInRunDetails(details, 'documents_discovery')).toBe(details[0]);
  });

  it('should match by task_id when it holds the task name (fake/seed data)', () => {
    const details = [task({ task_id: 'documents-discovery', display_name: undefined })];
    expect(findComponentTaskInRunDetails(details, 'documents_discovery')).toBe(details[0]);
  });

  it('should exclude driver tasks', () => {
    const details = [
      task({ task_id: 'documents-discovery-driver', display_name: 'documents-discovery-driver' }),
    ];
    expect(findComponentTaskInRunDetails(details, 'documents_discovery')).toBeUndefined();
  });

  it('should return undefined when no task matches', () => {
    expect(findComponentTaskInRunDetails([], 'documents_discovery')).toBeUndefined();
  });
});

describe('findComponentTasksInRunDetails', () => {
  it('should return all non-driver matches including branch suffixes', () => {
    const details = [
      task({ task_id: 'uuid-1', display_name: 'pattern-generation' }),
      task({ task_id: 'uuid-2', display_name: 'pattern-generation-2' }),
      task({ task_id: 'uuid-3', display_name: 'pattern-generation-driver' }),
      task({ task_id: 'uuid-4', display_name: 'vector-db-setup' }),
    ];
    const matches = findComponentTasksInRunDetails(details, 'pattern_generation');
    expect(matches).toHaveLength(2);
    expect(matches).toContain(details[0]);
    expect(matches).toContain(details[1]);
  });
});

describe('findFirstFailedTaskKey', () => {
  it('should return the first failed task display name', () => {
    const details = [
      task({ task_id: 'uuid-1', display_name: 'documents-discovery', state: 'SUCCEEDED' }),
      task({ task_id: 'uuid-2', display_name: 'pattern-generation', state: 'FAILED' }),
    ];
    expect(findFirstFailedTaskKey(details)).toBe('pattern-generation');
  });

  it('should fall back to the task id when display name is missing', () => {
    const details = [task({ task_id: 'training', display_name: undefined, state: 'FAILED' })];
    expect(findFirstFailedTaskKey(details)).toBe('training');
  });

  it('should skip failed driver tasks', () => {
    const details = [
      task({ task_id: 'uuid-1', display_name: 'documents-discovery-driver', state: 'FAILED' }),
      task({ task_id: 'uuid-2', display_name: 'vector-db-setup', state: 'FAILED' }),
    ];
    expect(findFirstFailedTaskKey(details)).toBe('vector-db-setup');
  });

  it('should return undefined when no executor task failed', () => {
    expect(
      findFirstFailedTaskKey([task({ task_id: 'uuid-1', display_name: 'documents-discovery' })]),
    ).toBeUndefined();
    expect(findFirstFailedTaskKey([])).toBeUndefined();
  });

  it('should prefer the first failed stage-map component over KFP system tasks', () => {
    // Mirrors live KFP output: the pipeline wrapper, `root`, and generic
    // `executor` system tasks fail alongside the real component and appear
    // earlier in the task listing.
    const details = [
      task({
        task_id: 'uuid-0',
        display_name: 'documents-rag-optimization-pipeline-vtx7r',
        state: 'FAILED',
      }),
      task({ task_id: 'uuid-1', display_name: 'root', state: 'FAILED' }),
      task({ task_id: 'uuid-2', display_name: 'executor', state: 'FAILED' }),
      task({ task_id: 'uuid-3', display_name: 'documents-discovery', state: 'SUCCEEDED' }),
      task({ task_id: 'uuid-4', display_name: 'search-space-preparation', state: 'FAILED' }),
    ];
    expect(
      findFirstFailedTaskKey(details, ['documents_discovery', 'search_space_preparation']),
    ).toBe('search-space-preparation');
  });

  it('should walk stage-map components in pipeline order', () => {
    const details = [
      task({ task_id: 'uuid-1', display_name: 'search-space-preparation', state: 'FAILED' }),
      task({ task_id: 'uuid-2', display_name: 'documents-discovery', state: 'FAILED' }),
    ];
    expect(
      findFirstFailedTaskKey(details, ['documents_discovery', 'search_space_preparation']),
    ).toBe('documents-discovery');
  });

  it('should match a failed branch-suffixed component task', () => {
    const details = [
      task({ task_id: 'uuid-1', display_name: 'pattern-generation-2', state: 'FAILED' }),
    ];
    expect(findFirstFailedTaskKey(details, ['pattern_generation'])).toBe('pattern-generation-2');
  });

  it('should return undefined when no stage-map component failed', () => {
    const details = [
      task({
        task_id: 'uuid-0',
        display_name: 'documents-rag-optimization-pipeline-vtx7r',
        state: 'FAILED',
      }),
      task({ task_id: 'uuid-1', display_name: 'documents-discovery', state: 'SUCCEEDED' }),
    ];
    expect(findFirstFailedTaskKey(details, ['documents_discovery'])).toBeUndefined();
  });

  it('should fall back to raw task order without stage-map components', () => {
    const details = [
      task({
        task_id: 'uuid-0',
        display_name: 'documents-rag-optimization-pipeline-vtx7r',
        state: 'FAILED',
      }),
      task({ task_id: 'uuid-1', display_name: 'documents-discovery', state: 'FAILED' }),
    ];
    expect(findFirstFailedTaskKey(details)).toBe('documents-rag-optimization-pipeline-vtx7r');
  });
});

describe('findTaskDirPrefix', () => {
  it('should find the prefix whose leaf matches a candidate name', () => {
    const prefixes = [
      { prefix: 'root/run-1/vector-db-setup/' },
      { prefix: 'root/run-1/documents-discovery/' },
    ];
    expect(findTaskDirPrefix(prefixes, ['documents-discovery'])).toBe(
      'root/run-1/documents-discovery/',
    );
  });

  it('should match a branch suffix variant of any candidate', () => {
    const prefixes = [{ prefix: 'root/run-1/documents-discovery-2/' }];
    expect(findTaskDirPrefix(prefixes, ['documents-discovery', 'other'])).toBe(
      'root/run-1/documents-discovery-2/',
    );
  });

  it('should match an underscore component id candidate via hyphen conversion', () => {
    const prefixes = [{ prefix: 'root/run-1/documents-discovery/' }];
    expect(findTaskDirPrefix(prefixes, ['documents_discovery'])).toBe(
      'root/run-1/documents-discovery/',
    );
  });

  it('should return undefined when nothing matches', () => {
    expect(findTaskDirPrefix([{ prefix: 'root/run-1/other/' }], ['documents-discovery'])).toBe(
      undefined,
    );
    expect(findTaskDirPrefix([], ['documents-discovery'])).toBe(undefined);
  });
});
