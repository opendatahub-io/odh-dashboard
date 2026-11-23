/* eslint-disable camelcase */
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useTasksForPipelineRun from '#~/concepts/pipelines/apiHooks/useTasksForPipelineRun';
import { buildMockRunKF } from '#~/__mocks__';
import { PipelineTaskKF, TaskStateKF, TaskTypeKF } from '#~/concepts/pipelines/kfTypes';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const task = (taskId: string): PipelineTaskKF => ({
  task_id: taskId,
  run_id: 'run-1',
  name: taskId,
  state: TaskStateKF.SUCCEEDED,
  type: TaskTypeKF.RUNTIME,
});

describe('useTasksForPipelineRun', () => {
  const mockListTasks = jest.fn();
  const mockUsePipelinesAPI = usePipelinesAPI as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      api: {
        listTasks: mockListTasks,
      },
    });
  });

  it('should not list tasks when the run is missing', () => {
    const renderResult = testHook(useTasksForPipelineRun)(null);
    expect(renderResult).hookToStrictEqual(standardUseFetchState([]));
    expect(mockListTasks).not.toHaveBeenCalled();
  });

  it('should follow next_page_token until the list is exhausted', async () => {
    mockListTasks
      .mockResolvedValueOnce({
        tasks: [task('task-1')],
        next_page_token: 'page-2',
      })
      .mockResolvedValueOnce({
        tasks: [task('task-2')],
      });

    const renderResult = testHook(useTasksForPipelineRun)(buildMockRunKF({ run_id: 'run-1' }));
    await renderResult.waitForNextUpdate();

    expect(mockListTasks).toHaveBeenNthCalledWith(1, expect.anything(), 'run-1', {
      pageSize: 100,
      pageToken: undefined,
    });
    expect(mockListTasks).toHaveBeenNthCalledWith(2, expect.anything(), 'run-1', {
      pageSize: 100,
      pageToken: 'page-2',
    });
    expect(renderResult.result.current[0].map((item) => item.task_id)).toEqual([
      'task-1',
      'task-2',
    ]);
  });

  it('should stop when the next page token repeats', async () => {
    mockListTasks.mockResolvedValue({
      tasks: [task('task-1')],
      next_page_token: 'again',
    });

    const renderResult = testHook(useTasksForPipelineRun)(buildMockRunKF({ run_id: 'run-1' }));
    await renderResult.waitForNextUpdate();

    expect(mockListTasks).toHaveBeenCalledTimes(2);
    expect(renderResult.result.current[0]).toHaveLength(2);
  });
});
