import type { ProjectKind } from '@odh-dashboard/k8s-core';
import {
  getStoredPreferredProject,
  PREFERRED_NAMESPACE_STORAGE_KEY,
} from '../getStoredPreferredProject';

const STORAGE_KEY = PREFERRED_NAMESPACE_STORAGE_KEY;

const makeProject = (name: string): ProjectKind =>
  ({
    kind: 'Project',
    apiVersion: 'project.openshift.io/v1',
    metadata: { name },
    status: { phase: 'Active' },
  } as ProjectKind);

describe('getStoredPreferredProject', () => {
  const project1 = makeProject('project-a');
  const project2 = makeProject('project-b');
  const projects = [project1, project2];

  afterEach(() => {
    localStorage.clear();
  });

  it('should return undefined when nothing is stored', () => {
    expect(getStoredPreferredProject(projects)).toBeUndefined();
  });

  it('should return the matching project when a JSON-stringified name is stored', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('project-b'));
    expect(getStoredPreferredProject(projects)).toBe(project2);
  });

  it('should return the matching project when a raw string name is stored', () => {
    localStorage.setItem(STORAGE_KEY, 'project-a');
    expect(getStoredPreferredProject(projects)).toBe(project1);
  });

  it('should return undefined when the stored name does not match any project', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('nonexistent'));
    expect(getStoredPreferredProject(projects)).toBeUndefined();
  });

  it('should return undefined when projects list is empty', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('project-a'));
    expect(getStoredPreferredProject([])).toBeUndefined();
  });
});
