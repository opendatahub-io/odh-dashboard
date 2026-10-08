import {
  orderProjectSelectionProjects,
  resolveProjectSelection,
  type ProjectSelectionCandidate,
} from '../projectSelection';

type TestProject = {
  name: string;
  displayName?: string;
  ai?: boolean;
};

const accessors = {
  getName: (project: TestProject) => project.name,
  getDisplayName: (project: TestProject) => project.displayName,
};
const isAiProject = (project: TestProject) => project.ai === true;
const project = (name: string, displayName?: string, ai = false): TestProject => ({
  name,
  displayName,
  ai,
});

const resolve = (
  projects: readonly TestProject[] | null,
  routeCandidate: ProjectSelectionCandidate = { status: 'absent' },
  storedProjectName: string | null = null,
  activeProject: TestProject | null = null,
  providerValidatedProjects: readonly TestProject[] = [],
) =>
  resolveProjectSelection({
    list: projects
      ? { status: 'available', projects }
      : { status: 'list-unavailable', providerValidatedProjects },
    routeCandidate,
    storedProjectName,
    activeProject,
    getName: accessors.getName,
    isAiProject,
  });

describe('orderProjectSelectionProjects', () => {
  it('should order labels case-insensitively and with numeric awareness', () => {
    const projects = [project('ten', 'Project 10'), project('two', 'project 2'), project('one')];

    expect(orderProjectSelectionProjects(projects, accessors).map(({ name }) => name)).toEqual([
      'one',
      'two',
      'ten',
    ]);
  });

  it('should use resource name as the deterministic tie-breaker for duplicate labels', () => {
    const projects = [
      project('beta', 'Shared'),
      project('alpha-10', 'shared'),
      project('alpha-2', 'SHARED'),
    ];

    expect(orderProjectSelectionProjects(projects, accessors).map(({ name }) => name)).toEqual([
      'alpha-2',
      'alpha-10',
      'beta',
    ]);
  });

  it('should use the resource name for missing and blank display names', () => {
    const projects = [project('project-10', ' '), project('project-2')];

    expect(orderProjectSelectionProjects(projects, accessors).map(({ name }) => name)).toEqual([
      'project-2',
      'project-10',
    ]);
  });
});

describe('resolveProjectSelection', () => {
  const first = project('first');
  const ai = project('ai', undefined, true);
  const route = project('route');
  const stored = project('stored');
  const ordered = [first, ai, route, stored];

  it('should prefer a valid route over a conflicting stored project', () => {
    expect(resolve(ordered, { status: 'present', name: route.name }, stored.name)).toEqual({
      status: 'selected',
      activeProject: route,
      source: 'route',
    });
  });

  it('should use storage only when route input is absent', () => {
    expect(resolve(ordered, { status: 'absent' }, stored.name)).toEqual({
      status: 'selected',
      activeProject: stored,
      source: 'storage',
    });
  });

  it.each(['deleted', ''])('should distinguish invalid route input %p from no route', (name) => {
    expect(resolve(ordered, { status: 'present', name }, stored.name)).toEqual({
      status: 'invalid-route',
      activeProject: null,
      candidate: name,
    });
  });

  it('should retain the current valid project for an invalid route', () => {
    expect(resolve(ordered, { status: 'present', name: 'deleted' }, stored.name, first)).toEqual({
      status: 'invalid-route',
      activeProject: first,
      candidate: 'deleted',
    });
  });

  it('should prefer the first AI project and otherwise the first ordered project', () => {
    expect(resolve(ordered)).toEqual({
      status: 'selected',
      activeProject: ai,
      source: 'fallback',
    });
    expect(resolve(ordered, { status: 'absent' }, 'deleted')).toEqual({
      status: 'selected',
      activeProject: ai,
      source: 'fallback',
    });
    expect(resolve([first, route])).toEqual({
      status: 'selected',
      activeProject: first,
      source: 'fallback',
    });
  });

  it('should return no selection for an available empty list', () => {
    expect(resolve([])).toEqual({ status: 'none', activeProject: null });
  });

  it('should keep an unknown candidate pending when the list is unavailable', () => {
    expect(resolve(null, { status: 'present', name: 'candidate' }, null, first, [first])).toEqual({
      status: 'pending-validation',
      activeProject: first,
      candidate: 'candidate',
    });
    expect(resolve(null, { status: 'absent' }, 'candidate', first, [first])).toEqual({
      status: 'pending-validation',
      activeProject: first,
      candidate: 'candidate',
    });
  });

  it('should not invent a fallback when the list is unavailable', () => {
    expect(resolve(null)).toEqual({ status: 'none', activeProject: null });
  });
});
