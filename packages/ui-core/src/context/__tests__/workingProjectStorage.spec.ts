import {
  parseStoredWorkingProjectName,
  persistWorkingProject,
  readStoredWorkingProjectName,
} from '../workingProjectStorage';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '../getStoredPreferredProject';

const known = { name: 'project-2', displayName: 'Project 2' };
const key = PREFERRED_NAMESPACE_STORAGE_KEY;

describe('working project storage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('should use the existing legacy persistence key', () => {
    expect(PREFERRED_NAMESPACE_STORAGE_KEY).toBe('mod-arch.namespace.lastUsed');
  });

  it.each([
    ['"project-2"', 'project-2'],
    ['project-2', 'project-2'],
    [null, null],
    ['', null],
    ['""', null],
    ['null', 'null'],
    ['123', '123'],
    ['true', 'true'],
    ['false', 'false'],
    ['{"name":"project-2"}', null],
    ['[]', null],
  ])(
    'should parse stored value %s to %s without treating objects as identities',
    (raw, expected) => {
      expect(parseStoredWorkingProjectName(raw)).toBe(expected);
    },
  );

  it('should read legacy and JSON values and tolerate blocked localStorage reads', () => {
    localStorage.setItem(key, 'project-2');
    expect(readStoredWorkingProjectName(localStorage)).toBe('project-2');
    localStorage.setItem(key, JSON.stringify('project-10'));
    expect(readStoredWorkingProjectName(localStorage)).toBe('project-10');
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readStoredWorkingProjectName(blocked)).toBeNull();
  });

  it.each(['123', 'true', 'null'])(
    'should restore a valid scalar-shaped legacy namespace name %s',
    (name) => {
      localStorage.setItem(key, name);
      expect(readStoredWorkingProjectName(localStorage)).toBe(name);
    },
  );

  it('should only persist a known resource name in the established JSON format', () => {
    expect(
      persistWorkingProject(localStorage, { ...known, displayName: 'Untrusted' }, [known]),
    ).toBe(true);
    expect(localStorage.getItem(key)).toBe('"project-2"');
    expect(persistWorkingProject(localStorage, { name: 'not-accessible' }, [known])).toBe(false);
    expect(persistWorkingProject(localStorage, { name: '' }, [known])).toBe(false);
    expect(localStorage.getItem(key)).toBe('"project-2"');
  });

  it('should skip redundant writes, including when the existing value is a legacy raw string', () => {
    localStorage.setItem(key, known.name);
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    expect(persistWorkingProject(localStorage, known, [known])).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('should skip a redundant write for a legacy scalar-shaped namespace name', () => {
    const numericProject = { name: '123' };
    localStorage.setItem(key, numericProject.name);
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    expect(persistWorkingProject(localStorage, numericProject, [numericProject])).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('should not prevent selection when reading or writing storage throws', () => {
    const readBlocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: jest.fn(),
    };
    expect(persistWorkingProject(readBlocked, known, [known])).toBe(false);
    expect(readBlocked.setItem).not.toHaveBeenCalled();

    const writeBlocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(persistWorkingProject(writeBlocked, known, [known])).toBe(false);
  });
});
