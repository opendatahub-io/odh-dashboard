/**
 * @jest-environment jsdom
 */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { getProjectsWithWorkbenches } from '../../api/connectedWorkbenches';
import {
  ConnectedWorkbenchesResponse,
  FeastProjectWithWorkbenches,
} from '../../types/connectedWorkbenches';
import { useConnectedWorkbenches } from '../useConnectedWorkbenches';

jest.mock('../../api/connectedWorkbenches', () => ({
  getProjectsWithWorkbenches: jest.fn(),
}));

const mockGetProjectsWithWorkbenches = jest.mocked(getProjectsWithWorkbenches);

const mockWorkbenchProject = (
  partial?: Partial<FeastProjectWithWorkbenches>,
): FeastProjectWithWorkbenches => ({
  feastProjectName: 'credit_scoring_local',
  namespace: 'default',
  permissionLevel: ['read'],
  connectedWorkbenches: [],
  ...partial,
});

const mockResponse = (projects: FeastProjectWithWorkbenches[]): ConnectedWorkbenchesResponse => ({
  connectedWorkbenches: projects,
});

describe('useConnectedWorkbenches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch projects and scope selectedProject to feastProjectName', async () => {
    const projects = [
      mockWorkbenchProject({ feastProjectName: 'project-a' }),
      mockWorkbenchProject({ feastProjectName: 'project-b', permissionLevel: ['write'] }),
    ];
    mockGetProjectsWithWorkbenches.mockResolvedValue(mockResponse(projects));

    const renderResult = testHook(useConnectedWorkbenches)('project-b');

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.projects).toEqual([]);
    expect(renderResult.result.current.selectedProject).toBeUndefined();

    await renderResult.waitForNextUpdate();

    expect(mockGetProjectsWithWorkbenches).toHaveBeenCalledTimes(1);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult.result.current.projects).toEqual(projects);
    expect(renderResult.result.current.selectedProject).toEqual(projects[1]);
  });

  it('should return undefined selectedProject when feastProjectName is not provided', async () => {
    const projects = [mockWorkbenchProject()];
    mockGetProjectsWithWorkbenches.mockResolvedValue(mockResponse(projects));

    const renderResult = testHook(useConnectedWorkbenches)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.projects).toEqual(projects);
    expect(renderResult.result.current.selectedProject).toBeUndefined();
  });

  it('should return undefined selectedProject when feastProjectName does not match', async () => {
    mockGetProjectsWithWorkbenches.mockResolvedValue(
      mockResponse([mockWorkbenchProject({ feastProjectName: 'other-project' })]),
    );

    const renderResult = testHook(useConnectedWorkbenches)('missing-project');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.projects).toHaveLength(1);
    expect(renderResult.result.current.selectedProject).toBeUndefined();
  });

  it('should skip fetch and return empty data when disabled', async () => {
    const renderResult = testHook(useConnectedWorkbenches)('credit_scoring_local', false);

    await renderResult.waitForNextUpdate();

    expect(mockGetProjectsWithWorkbenches).not.toHaveBeenCalled();
    expect(renderResult.result.current.projects).toEqual([]);
    expect(renderResult.result.current.selectedProject).toBeUndefined();
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should handle API errors', async () => {
    const error = new Error('Failed to load connected workbenches');
    mockGetProjectsWithWorkbenches.mockRejectedValue(error);

    const renderResult = testHook(useConnectedWorkbenches)('credit_scoring_local');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(error);
    expect(renderResult.result.current.projects).toEqual([]);
    expect(renderResult.result.current.selectedProject).toBeUndefined();
  });

  it('should refresh data when refresh is called', async () => {
    mockGetProjectsWithWorkbenches.mockResolvedValue(mockResponse([mockWorkbenchProject()]));

    const renderResult = testHook(useConnectedWorkbenches)('credit_scoring_local');

    await renderResult.waitForNextUpdate();
    expect(mockGetProjectsWithWorkbenches).toHaveBeenCalledTimes(1);

    await renderResult.result.current.refresh();

    expect(mockGetProjectsWithWorkbenches).toHaveBeenCalledTimes(2);
  });
});
