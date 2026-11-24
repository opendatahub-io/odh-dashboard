/* eslint-disable camelcase */
import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import useTasksForPipelineRun from '#~/concepts/pipelines/apiHooks/useTasksForPipelineRun';
import { buildMockRunKF } from '#~/__mocks__';
import { PipelineTaskKF, TaskStateKF, TaskTypeKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineAPIs } from '#~/concepts/pipelines/types';

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
  const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

  beforeEach(() => {
    jest.resetAllMocks();
    const api = { listTasks: mockListTasks } satisfies Pick<PipelineAPIs, 'listTasks'>;
    mockUsePipelinesAPI.mockReturnValue({
      api,
    } as unknown as ReturnType<typeof usePipelinesAPI>);
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

  it('should surface an error when the next page token repeats', async () => {
    mockListTasks.mockResolvedValue({
      tasks: [task('task-1')],
      next_page_token: 'again',
    });

    const renderResult = testHook(useTasksForPipelineRun)(buildMockRunKF({ run_id: 'run-1' }));
    await renderResult.waitForNextUpdate();

    expect(mockListTasks).toHaveBeenCalledTimes(2);
    expect(renderResult.result.current[2]?.message).toContain('page token repeated');
    expect(renderResult.result.current[0]).toEqual([]);
  });

  it('should surface an error when paging does not finish', async () => {
    let page = 0;
    mockListTasks.mockImplementation(() =>
      Promise.resolve({
        tasks: [task(`task-${page}`)],
        next_page_token: `page-${page++}`,
      }),
    );

    const renderResult = testHook(useTasksForPipelineRun)(buildMockRunKF({ run_id: 'run-1' }));
    await renderResult.waitForNextUpdate();

    expect(mockListTasks).toHaveBeenCalledTimes(100);
    expect(renderResult.result.current[2]?.message).toContain('exceeded 100 pages');
    expect(renderResult.result.current[0]).toEqual([]);
  });
});
