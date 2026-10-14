import { orderWorkingProjects, resolveWorkingProject } from '../workingProject';
import type { WorkingProjectIdentity } from '../workingProject';

const project = (name: string, displayName?: string): WorkingProjectIdentity => ({
  name,
  displayName,
});
const projects = [
  project('team-10', 'Project 10'),
  project('ai-2', 'Project 2'),
  project('team-2', 'project 2'),
  project('alpha', 'Alpha'),
];
const listed = { status: 'listed' as const, projects };
const resolve = resolveWorkingProject;

describe('orderWorkingProjects', () => {
  it('should sort labels case-insensitively and numerically with resource-name tie breaking', () => {
    expect(orderWorkingProjects(projects).map(({ name }) => name)).toEqual([
      'alpha',
      'ai-2',
      'team-2',
      'team-10',
    ]);
  });

  it('should fall back to resource names when display labels are absent and not mutate input', () => {
    const input = [project('x-10'), project('x-2'), project('a', 'Alpha')];
    expect(orderWorkingProjects(input).map(({ name }) => name)).toEqual(['a', 'x-2', 'x-10']);
    expect(input.map(({ name }) => name)).toEqual(['x-10', 'x-2', 'a']);
  });

  it('should distinguish names even when displayed labels differ only in case', () => {
    expect(
      orderWorkingProjects([project('z-project', 'SAME'), project('a-project', 'same')]).map(
        ({ name }) => name,
      ),
    ).toEqual(['a-project', 'z-project']);
  });
});

describe('resolveWorkingProject', () => {
  it('should use a valid route ahead of conflicting storage on entry and browser navigation', () => {
    for (const routeName of ['team-10', 'ai-2']) {
      const result = resolve({
        list: listed,
        route: { kind: 'project', name: routeName },
        storedName: 'alpha',
      });
      expect(result.activeProject?.name).toBe(routeName);
    }
  });

  it('should use storage only when the route does not specify a project', () => {
    const stored = resolve({ list: listed, route: null, storedName: 'team-2' });
    expect(stored.activeProject?.name).toBe('team-2');

    const invalid = resolve({
      list: listed,
      route: { kind: 'invalid' },
      storedName: 'team-2',
    });
    expect(invalid.activeProject).toBeNull();
    expect(invalid.orderedProjects).toHaveLength(projects.length);
  });

  it('should select the first project from the ordered collection exposed for the selector', () => {
    const result = resolve({ list: listed, route: null });
    expect(result.orderedProjects.map(({ name }) => name)).toEqual([
      'alpha',
      'ai-2',
      'team-2',
      'team-10',
    ]);
    expect(result.activeProject).toBe(result.orderedProjects[0]);
  });

  it('should choose the first AI project in displayed-label order, without reordering the selector', () => {
    const result = resolve({
      list: {
        status: 'listed',
        projects: [
          project('ai-10', 'Project 10'),
          project('team-2', 'Alpha team'),
          project('ai-2', 'Project 2'),
        ],
      },
      route: null,
      isAiProject: ({ name }) => name.startsWith('ai-'),
    });
    expect(result.orderedProjects.map(({ name }) => name)).toEqual(['team-2', 'ai-2', 'ai-10']);
    expect(result.activeProject).toBe(result.orderedProjects[1]);
  });

  it('should retain a valid stored non-AI project ahead of AI fallback', () => {
    const result = resolve({
      list: listed,
      route: null,
      storedName: 'team-2',
      isAiProject: ({ name }) => name === 'ai-2',
    });
    expect(result.activeProject?.name).toBe('team-2');
  });

  it('should retain a valid route non-AI project ahead of AI fallback', () => {
    const result = resolve({
      list: listed,
      route: { kind: 'project', name: 'team-10' },
      isAiProject: ({ name }) => name === 'ai-2',
    });
    expect(result.activeProject?.name).toBe('team-10');
  });

  it('should select the first accessible project when there are no AI projects', () => {
    const result = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3]] },
      route: null,
      isAiProject: () => false,
    });
    expect(result.activeProject).toBe(result.orderedProjects[0]);
    expect(result.activeProject?.name).toBe('alpha');
  });

  it('should choose the first listed project when there is no route or stored match', () => {
    const result = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3]] },
      route: null,
    });
    expect(result.activeProject).toBe(result.orderedProjects[0]);
    expect(result.activeProject?.name).toBe('alpha');
  });

  it('should ignore stale storage and choose the first listed project', () => {
    const result = resolve({ list: listed, route: null, storedName: 'deleted' });
    expect(result.activeProject?.name).toBe('alpha');
  });

  it('should ignore stale storage and choose the first AI project when classified', () => {
    const result = resolve({
      list: listed,
      route: null,
      storedName: 'deleted',
      isAiProject: ({ name }) => name === 'ai-2',
    });
    expect(result.activeProject?.name).toBe('ai-2');
  });

  it.each(['deleted', 'terminating', 'inaccessible'])(
    'should not activate an invalid %s deep link or replace it with storage',
    (name) => {
      const result = resolve({
        list: listed,
        route: { kind: 'project', name },
        storedName: 'ai-2',
        currentName: 'alpha',
      });
      expect(result.activeProject).toBeNull();
      expect(result.orderedProjects).toHaveLength(projects.length);
    },
  );

  it('should re-resolve after the formerly active route project is removed', () => {
    const result = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3]] },
      route: { kind: 'project', name: 'ai-2' },
      currentName: 'ai-2',
    });
    expect(result.activeProject?.name).toBe('alpha');
    expect(result.removedRouteFallback).toEqual({ routeName: 'ai-2', projectName: 'alpha' });
  });

  it('should keep the fallback stable across resolutions until the removed-project route changes', () => {
    const firstResolution = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3]] },
      route: { kind: 'project', name: 'ai-2' },
      currentName: 'ai-2',
    });
    const secondResolution = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3]] },
      route: { kind: 'project', name: 'ai-2' },
      currentName: firstResolution.activeProject?.name,
      removedRouteFallback: firstResolution.removedRouteFallback,
    });

    expect(firstResolution.activeProject?.name).toBe('alpha');
    expect(secondResolution.activeProject?.name).toBe('alpha');
    expect(secondResolution.removedRouteFallback).toEqual(firstResolution.removedRouteFallback);

    const reconciledResolution = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3]] },
      route: { kind: 'project', name: 'alpha' },
      currentName: secondResolution.activeProject?.name,
      removedRouteFallback: secondResolution.removedRouteFallback,
    });
    expect(reconciledResolution.activeProject?.name).toBe('alpha');
    expect(reconciledResolution.removedRouteFallback).toBeNull();
  });

  it('should not retain the fallback when the route changes to a different invalid project', () => {
    const result = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3]] },
      route: { kind: 'project', name: 'different-missing-project' },
      currentName: 'alpha',
      removedRouteFallback: { routeName: 'ai-2', projectName: 'alpha' },
    });
    expect(result.activeProject).toBeNull();
    expect(result.removedRouteFallback).toBeNull();
  });

  it('should prefer another AI project when the formerly active route project is removed', () => {
    const result = resolve({
      list: { status: 'listed', projects: [projects[0], projects[3], projects[2]] },
      route: { kind: 'project', name: 'ai-2' },
      currentName: 'ai-2',
      isAiProject: ({ name }) => name === 'team-2',
    });
    expect(result.activeProject?.name).toBe('team-2');
  });

  it('should keep a listed empty collection distinct from loading and provider error', () => {
    expect(resolve({ list: { status: 'listed', projects: [] }, route: null })).toMatchObject({
      activeProject: null,
      orderedProjects: [],
    });
    for (const status of ['loading', 'error'] as const) {
      const result = resolve({ list: { status }, route: { kind: 'project', name: 'unlisted' } });
      expect(result.activeProject).toBeNull();
    }
  });
});
