import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { getStoredWorkingProjectName } from '#~/concepts/projects/workingProjectAdapterUtils';

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
