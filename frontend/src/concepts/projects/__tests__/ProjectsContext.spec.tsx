import * as React from 'react';
import { act, render } from '@testing-library/react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { useProjects } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import ProjectsContextProvider from '#~/concepts/projects/ProjectsContext';

jest.mock('#~/api', () => ({ useProjects: jest.fn() }));
jest.mock('#~/redux/selectors', () => ({ useDashboardNamespace: jest.fn() }));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseProjects = jest.mocked(useProjects);
const mockUseDashboardNamespace = jest.mocked(useDashboardNamespace);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
let context: React.ContextType<typeof ProjectsContext>;
const Consumer: React.FC = () => {
  context = React.useContext(ProjectsContext);
  return null;
};
let working: ReturnType<typeof useWorkingProject>;
const WorkingConsumer: React.FC = () => {
  working = useWorkingProject();
  return null;
};
const project = (name: string, displayName = name, phase: 'Active' | 'Terminating' = 'Active') =>
  mockProjectK8sResource({ k8sName: name, displayName, phase });

describe('RHOAI ProjectsContextProvider working-project flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseIsAreaAvailable.mockImplementation((area) => {
      expect(area).toBe(SupportedArea.UNIFIED_PROJECT_SELECTOR);
      return { status: false } as ReturnType<typeof useIsAreaAvailable>;
    });
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'dashboard' } as ReturnType<
      typeof useDashboardNamespace
    >);
  });

  afterEach(() => jest.restoreAllMocks());

  const watch = (data: ProjectKind[], loaded = true, error?: Error) => {
    mockUseProjects.mockReturnValue([data, loaded, error]);
  };

  const enableUnifiedProjectSelector = () => {
    mockUseIsAreaAvailable.mockReturnValue({ status: true } as ReturnType<
      typeof useIsAreaAvailable
    >);
  };

  it('should leave default restoration, ordering and clearing unchanged', () => {
    const z = project('z', 'Z');
    const a = project('a', 'A');
    watch([z, a]);
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, 'z');
    render(
      <ProjectsContextProvider>
        <Consumer />
        <WorkingConsumer />
      </ProjectsContextProvider>,
    );
    expect(context.projects).toEqual([a, z]);
    expect(context.preferredProject).toBe(z);
    expect(working.activeProject).toBeNull();
    expect(working.status).toBe('provider-absent');
    act(() => context.updatePreferredProject(null));
    expect(context.preferredProject).toBeNull();
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBeNull();
    expect(mockUseProjects).toHaveBeenCalled();
  });

  it('should leave the legacy context and storage behavior unchanged with the flag off', () => {
    const a = project('a', 'Alpha');
    const b = project('b', 'Beta');
    watch([b, a]);
    const storageWrites = jest.spyOn(Storage.prototype, 'setItem');
    const { rerender } = render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    const initialUpdater = context.updatePreferredProject;
    expect(context.projects).toEqual([a, b]);
    expect(context.preferredProject).toBeNull();
    expect(storageWrites).not.toHaveBeenCalled();

    act(() => context.updatePreferredProject(b));
    expect(context.preferredProject).toBe(b);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('"b"');

    watch([a]);
    rerender(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    // The legacy provider does not clear a preferred project when the watch changes.
    expect(context.preferredProject).toBe(b);
    expect(context.updatePreferredProject).toBe(initialUpdater);

    const unknown = project('unknown');
    act(() => context.updatePreferredProject(unknown));
    // Validation is strictly opt-in; existing consumers can still set their legacy preference.
    expect(context.preferredProject).toBe(unknown);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('"unknown"');
    expect(storageWrites).toHaveBeenCalledTimes(2);
  });

  it('should mount the working-project adapter when UPS is enabled at the app root', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    const b = project('b');
    watch([a, b]);
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, 'b');
    render(
      <ProjectsContextProvider>
        <Consumer />
        <WorkingConsumer />
      </ProjectsContextProvider>,
    );
    expect(context.preferredProject).toBe(b);
    expect(working.activeProject?.name).toBe('b');
    expect(working.status).toBe('listed');
    act(() => context.updatePreferredProject(null));
    expect(context.preferredProject).toBe(b);
    expect(working.activeProject?.name).toBe('b');
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('b');
  });

  it('should validate source selection and tolerate failed persistence only when opted in', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    const terminating = project('terminating', 'Terminating', 'Terminating');
    watch([a, terminating]);
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    act(() => context.updatePreferredProject(terminating));
    expect(context.preferredProject).toBe(a);
    act(() => context.updatePreferredProject(project('unknown')));
    expect(context.preferredProject).toBe(a);
    expect(setItem).not.toHaveBeenCalled();
    getItem.mockRestore();
    localStorage.removeItem(PREFERRED_NAMESPACE_STORAGE_KEY);
    act(() => context.updatePreferredProject({ ...a }));
    expect(context.preferredProject).toBe(a);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('should resolve and commit in memory when the storage getter itself throws', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    watch([a]);
    const blockedStorage = jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    try {
      render(
        <ProjectsContextProvider>
          <Consumer />
          <WorkingConsumer />
        </ProjectsContextProvider>,
      );
      expect(working.activeProject?.name).toBe('a');
      expect(context.preferredProject).toBe(a);
      expect(blockedStorage).toHaveBeenCalled();
    } finally {
      blockedStorage.mockRestore();
    }
  });

  it('should hide removed or inaccessible preferred projects and refresh canonical records', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    watch([a]);
    const { rerender } = render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    act(() => context.updatePreferredProject(a));
    const refreshed = project('a', 'Refreshed');
    watch([refreshed]);
    rerender(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    expect(context.preferredProject).toBe(refreshed);
    watch([], true);
    rerender(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    expect(context.preferredProject).toBeNull();
    watch([refreshed], false);
    rerender(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    expect(context.preferredProject).toBeNull();
    watch([refreshed], true, new Error('forbidden'));
    rerender(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    expect(context.preferredProject).toBeNull();
  });

  it('should keep the opted-in legacy and lightweight consumers in sync without a second watch', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    const b = project('b');
    watch([a, b]);
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, 'b');
    render(
      <ProjectsContextProvider>
        <Consumer />
        <WorkingConsumer />
      </ProjectsContextProvider>,
    );
    expect(context.preferredProject).toBe(b);
    expect(working.activeProject?.name).toBe('b');
    act(() => working.selectProject({ name: 'a' }));
    expect(context.preferredProject).toBe(a);
    expect(working.activeProject?.name).toBe('a');
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('"a"');
    act(() => context.updatePreferredProject(b));
    expect(working.activeProject?.name).toBe('b');
    act(() => context.updatePreferredProject(null));
    expect(working.activeProject?.name).toBe('b');
    expect(context.preferredProject).toBe(b);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('"b"');
    act(() => working.selectProject({ name: 'a' }));
    expect(context.preferredProject).toBe(a);
    expect(working.activeProject?.name).toBe('a');
  });

  it('should replace a removed active project with a known fallback in opted-in mode', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    const b = project('b');
    watch([a, b]);
    const tree = () => (
      <ProjectsContextProvider>
        <Consumer />
        <WorkingConsumer />
      </ProjectsContextProvider>
    );
    const { rerender } = render(tree());
    act(() => working.selectProject({ name: 'b' }));
    expect(context.preferredProject).toBe(b);
    watch([a]);
    rerender(tree());
    expect(context.preferredProject).toBe(a);
    expect(working.activeProject?.name).toBe('a');
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('"a"');
    watch([]);
    rerender(tree());
    expect(context.preferredProject).toBeNull();
    expect(working.activeProject).toBeNull();
  });

  it('should not clear a valid UPS selection on repeated legacy null updates or watch refresh', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    watch([a]);
    const tree = () => (
      <ProjectsContextProvider>
        <Consumer />
        <WorkingConsumer />
      </ProjectsContextProvider>
    );
    const { rerender } = render(tree());
    expect(working.activeProject?.name).toBe('a');
    const stored = localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY);
    act(() => {
      context.updatePreferredProject(null);
      context.updatePreferredProject(null);
    });
    expect(working.activeProject?.name).toBe('a');
    expect(context.preferredProject).toBe(a);
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(stored);
    const refreshed = project('a', 'Refreshed');
    watch([refreshed]);
    rerender(tree());
    expect(context.preferredProject).toBe(refreshed);
    expect(working.activeProject).toEqual({ name: 'a', displayName: 'Refreshed' });
  });

  it('should keep legacy and UPS selections aligned when the watch is temporarily unavailable', () => {
    enableUnifiedProjectSelector();
    const a = project('a');
    const b = project('b');
    watch([a, b]);
    const tree = () => (
      <ProjectsContextProvider>
        <Consumer />
        <WorkingConsumer />
      </ProjectsContextProvider>
    );
    const { rerender } = render(tree());
    act(() => working.selectProject({ name: 'b' }));
    watch([a, b], false);
    rerender(tree());
    expect(working.activeProject).toBeNull();
    expect(context.preferredProject).toBeNull();
    act(() => context.updatePreferredProject(a));
    expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe('"b"');
    watch([a, b], true, new Error('watch failed'));
    rerender(tree());
    act(() => context.updatePreferredProject(a));
    expect(working.activeProject).toBeNull();
    watch([a, b]);
    rerender(tree());
    expect(working.activeProject?.name).toBe('b');
    expect(context.preferredProject).toBe(b);
  });

  it('should exclude dashboard, system, and terminating projects from the adapter', () => {
    enableUnifiedProjectSelector();
    const accessible = project('accessible', 'Accessible');
    watch([
      project('dashboard'),
      project('openshift-monitoring'),
      project('terminating', 'Terminating', 'Terminating'),
      accessible,
    ]);
    render(
      <ProjectsContextProvider>
        <Consumer />
        <WorkingConsumer />
      </ProjectsContextProvider>,
    );
    expect(working.projects).toEqual([{ name: 'accessible', displayName: 'Accessible' }]);
    expect(working.activeProject?.name).toBe('accessible');
    act(() => working.selectProject({ name: 'terminating' }));
    expect(context.preferredProject).toBe(accessible);
  });
});
