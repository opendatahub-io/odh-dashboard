import { mockProjectK8sResource } from '#~/__mocks__';
import { getStoredPreferredProject } from '#~/concepts/projects/getStoredPreferredProject';

const STORAGE_KEY = 'mod-arch.namespace.lastUsed';

describe('getStoredPreferredProject', () => {
  const project1 = mockProjectK8sResource({ k8sName: 'project-a', displayName: 'Project A' });
  const project2 = mockProjectK8sResource({ k8sName: 'project-b', displayName: 'Project B' });
  const projects = [project1, project2];

  afterEach(() => {
    localStorage.clear();
  });

  it('returns undefined when nothing is stored', () => {
    expect(getStoredPreferredProject(projects)).toBeUndefined();
  });

  it('returns the matching project when a JSON-stringified name is stored (mod-arch-core format)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('project-b'));
    expect(getStoredPreferredProject(projects)).toBe(project2);
  });

  it('returns the matching project when a raw string name is stored (legacy format)', () => {
    localStorage.setItem(STORAGE_KEY, 'project-a');
    expect(getStoredPreferredProject(projects)).toBe(project1);
  });

  it('returns undefined when the stored name does not match any project', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('nonexistent'));
    expect(getStoredPreferredProject(projects)).toBeUndefined();
  });

  it('returns undefined when projects list is empty', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('project-a'));
    expect(getStoredPreferredProject([])).toBeUndefined();
  });
});
