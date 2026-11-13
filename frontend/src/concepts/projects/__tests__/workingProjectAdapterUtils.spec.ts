import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { RouteProjectKindValue } from '@odh-dashboard/foundation';
import { WorkingProjectStatusValue } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import {
  getProjectDetailsRouteInput,
  getStoredWorkingProjectName,
  getWorkingProjectStatus,
} from '#~/concepts/projects/workingProjectAdapterUtils';

describe('getStoredWorkingProjectName', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should read only the working-project key and parse its legacy value', () => {
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, 'project-a');
    localStorage.setItem('unrelated', 'project-b');
    const getItem = jest.spyOn(Storage.prototype, 'getItem');

    expect(getStoredWorkingProjectName()).toBe('project-a');
    expect(getItem).toHaveBeenCalledWith(PREFERRED_NAMESPACE_STORAGE_KEY);
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('should read JSON-formatted names and return null when the key is absent', () => {
    expect(getStoredWorkingProjectName()).toBeNull();
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify('project-a'));
    expect(getStoredWorkingProjectName()).toBe('project-a');
  });

  it('should return null when reading storage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getStoredWorkingProjectName()).toBeNull();
  });
});

describe('getWorkingProjectStatus', () => {
  it.each([
    [false, undefined, false, WorkingProjectStatusValue.Loading],
    [true, new Error('unavailable'), true, WorkingProjectStatusValue.ProjectSourceError],
    [true, undefined, true, WorkingProjectStatusValue.RouteInvalid],
    [true, undefined, false, WorkingProjectStatusValue.Listed],
  ])(
    'should resolve status precedence for loaded=%s, error=%s, invalid=%s',
    (loaded, loadError, routeInvalid, expected) => {
      expect(getWorkingProjectStatus({ loaded, loadError, routeInvalid })).toBe(expected);
    },
  );
});

describe('getProjectDetailsRouteInput', () => {
  const recover = jest.fn();

  afterEach(() => jest.clearAllMocks());

  it.each([
    ['/projects/known', new Set(['known']), null],
    ['/projects/missing', new Set(['known']), RouteProjectKindValue.Invalid],
    ['/projects/%E0%A4%A', new Set(['known']), RouteProjectKindValue.Invalid],
    ['/home', new Set(['known']), null],
  ])('should classify project-details paths safely', (pathname, projectNames, expectedKind) => {
    const result = getProjectDetailsRouteInput(pathname, projectNames, recover);

    expect(result?.kind ?? null).toBe(expectedKind);
    if (result?.kind === RouteProjectKindValue.Invalid) {
      expect(result.recover).toBe(recover);
    }
  });
});
