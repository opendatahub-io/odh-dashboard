jest.mock('@patternfly/react-topology', () => ({
  DEFAULT_TASK_NODE_TYPE: 'DEFAULT_TASK_NODE',
  RunStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
    Running: 'Running',
    InProgress: 'InProgress',
    Idle: 'Idle',
    Pending: 'Pending',
  },
}));

// eslint-disable-next-line import/first
import { RunStatus } from '@patternfly/react-topology';
// eslint-disable-next-line import/first
import { NODE_WIDTH } from '~/app/topology/const';
// eslint-disable-next-line import/first
import type { PipelineTask } from '~/app/types/topology';
// eslint-disable-next-line import/first
import { createNode } from '~/app/topology/utils';

const mockTask = (name: string): PipelineTask => ({
  type: 'task',
  name,
});

describe('createNode', () => {
  it('should create a node with the correct id and label', () => {
    const node = createNode('task-1', 'My Task', mockTask('task-1'));

    expect(node.id).toBe('task-1');
    expect(node.label).toBe('My Task');
  });

  it('should set runAfterTasks when provided', () => {
    const node = createNode('task-2', 'Second Task', mockTask('task-2'), ['task-1']);

    expect(node.runAfterTasks).toEqual(['task-1']);
  });

  it('should set runStatus in data when provided', () => {
    const node = createNode(
      'task-1',
      'My Task',
      mockTask('task-1'),
      undefined,
      RunStatus.Succeeded,
    );

    expect(node.data.runStatus).toBe(RunStatus.Succeeded);
  });

  it('should have width at least NODE_WIDTH for short labels', () => {
    const node = createNode('t', 'Hi', mockTask('t'));

    expect(node.width).toBeGreaterThanOrEqual(NODE_WIDTH);
  });
});

describe('measureTextWidth via createNode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('should return NODE_WIDTH when canvas context is unavailable', () => {
    jest.resetModules();

    const originalCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, options?: ElementCreationOptions) => {
        if (tag === 'canvas') {
          return { getContext: () => null } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tag, options);
      });

    // Re-import to get a fresh module with no cached context
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createNode: freshCreateNode } = require('~/app/topology/utils');

    const node = freshCreateNode(
      'task-1',
      'A Very Long Task Name That Would Be Wide',
      mockTask('task-1'),
    );

    expect(node.width).toBe(NODE_WIDTH);
  });

  it('should return width wider than NODE_WIDTH for long labels when canvas is available', () => {
    jest.resetModules();

    const mockMeasureText = jest.fn((text: string) => ({ width: text.length * 10 }));
    const originalCreateElement = document.createElement.bind(document);
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, options?: ElementCreationOptions) => {
        if (tag === 'canvas') {
          return {
            getContext: () => ({
              font: '',
              measureText: mockMeasureText,
            }),
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tag, options);
      });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createNode: freshCreateNode } = require('~/app/topology/utils');

    // 30 chars * 10px = 300px + 40px padding = 340px > NODE_WIDTH (200)
    const longLabel = 'A'.repeat(30);
    const node = freshCreateNode('task-1', longLabel, mockTask('task-1'));

    // 30 chars * 10px = 300px + NODE_PADDING (40) = 340px
    expect(node.width).toBe(340);
    expect(mockMeasureText).toHaveBeenCalledWith(longLabel);
  });
});
