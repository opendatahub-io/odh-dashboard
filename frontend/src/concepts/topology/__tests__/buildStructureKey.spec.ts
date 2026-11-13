import { PipelineNodeModel } from '@patternfly/react-topology';
import { buildStructureKey } from '#~/concepts/topology/PipelineVisualizationSurface';

describe('buildStructureKey', () => {
  it('should return an empty string for an empty array', () => {
    expect(buildStructureKey([])).toBe('');
  });

  it('should produce the same key for nodes with identical structure', () => {
    const nodesA: PipelineNodeModel[] = [
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'Task 1', runAfterTasks: [] },
      {
        id: 'task-2',
        type: 'DEFAULT_TASK_NODE',
        label: 'Task 2',
        runAfterTasks: ['task-1'],
      },
    ];
    const nodesB: PipelineNodeModel[] = [
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'Task 1 Updated', runAfterTasks: [] },
      {
        id: 'task-2',
        type: 'DEFAULT_TASK_NODE',
        label: 'Task 2 Updated',
        runAfterTasks: ['task-1'],
      },
    ];

    expect(buildStructureKey(nodesA)).toBe(buildStructureKey(nodesB));
  });

  it('should produce different keys when a node is added', () => {
    const nodesA: PipelineNodeModel[] = [
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'Task 1', runAfterTasks: [] },
    ];
    const nodesB: PipelineNodeModel[] = [
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'Task 1', runAfterTasks: [] },
      {
        id: 'task-2',
        type: 'DEFAULT_TASK_NODE',
        label: 'Task 2',
        runAfterTasks: ['task-1'],
      },
    ];

    expect(buildStructureKey(nodesA)).not.toBe(buildStructureKey(nodesB));
  });

  it('should produce different keys when edge dependencies change', () => {
    const nodesA: PipelineNodeModel[] = [
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'Task 1', runAfterTasks: [] },
      { id: 'task-2', type: 'DEFAULT_TASK_NODE', label: 'Task 2', runAfterTasks: [] },
    ];
    const nodesB: PipelineNodeModel[] = [
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'Task 1', runAfterTasks: [] },
      {
        id: 'task-2',
        type: 'DEFAULT_TASK_NODE',
        label: 'Task 2',
        runAfterTasks: ['task-1'],
      },
    ];

    expect(buildStructureKey(nodesA)).not.toBe(buildStructureKey(nodesB));
  });

  it('should produce the same key regardless of node order', () => {
    const nodesA: PipelineNodeModel[] = [
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'A', runAfterTasks: [] },
      { id: 'task-2', type: 'DEFAULT_TASK_NODE', label: 'B', runAfterTasks: ['task-1'] },
    ];
    const nodesB: PipelineNodeModel[] = [
      { id: 'task-2', type: 'DEFAULT_TASK_NODE', label: 'B', runAfterTasks: ['task-1'] },
      { id: 'task-1', type: 'DEFAULT_TASK_NODE', label: 'A', runAfterTasks: [] },
    ];

    expect(buildStructureKey(nodesA)).toBe(buildStructureKey(nodesB));
  });

  it('should produce the same key regardless of dependency order within a node', () => {
    const nodesA: PipelineNodeModel[] = [
      {
        id: 'task-3',
        type: 'DEFAULT_TASK_NODE',
        label: 'Task 3',
        runAfterTasks: ['task-1', 'task-2'],
      },
    ];
    const nodesB: PipelineNodeModel[] = [
      {
        id: 'task-3',
        type: 'DEFAULT_TASK_NODE',
        label: 'Task 3',
        runAfterTasks: ['task-2', 'task-1'],
      },
    ];

    expect(buildStructureKey(nodesA)).toBe(buildStructureKey(nodesB));
  });

  it('should produce the same key regardless of children order within a group', () => {
    const nodesA: PipelineNodeModel[] = [
      {
        id: 'group-1',
        type: 'DEFAULT_TASK_GROUP',
        label: 'Group',
        group: true,
        children: ['task-a', 'task-b', 'task-c'],
        runAfterTasks: [],
      },
    ];
    const nodesB: PipelineNodeModel[] = [
      {
        id: 'group-1',
        type: 'DEFAULT_TASK_GROUP',
        label: 'Group',
        group: true,
        children: ['task-c', 'task-a', 'task-b'],
        runAfterTasks: [],
      },
    ];

    expect(buildStructureKey(nodesA)).toBe(buildStructureKey(nodesB));
  });

  it('should include children in the key for group nodes', () => {
    const nodesA: PipelineNodeModel[] = [
      {
        id: 'group-1',
        type: 'DEFAULT_TASK_GROUP',
        label: 'Group',
        group: true,
        children: ['task-a', 'task-b'],
        runAfterTasks: [],
      },
    ];
    const nodesB: PipelineNodeModel[] = [
      {
        id: 'group-1',
        type: 'DEFAULT_TASK_GROUP',
        label: 'Group',
        group: true,
        children: ['task-a', 'task-b', 'task-c'],
        runAfterTasks: [],
      },
    ];

    expect(buildStructureKey(nodesA)).not.toBe(buildStructureKey(nodesB));
  });
});
