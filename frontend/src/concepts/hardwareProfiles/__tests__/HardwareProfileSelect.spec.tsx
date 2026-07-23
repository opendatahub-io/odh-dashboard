import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  KnownLabels,
  SchedulingType,
  type HardwareProfileKind,
  type ProjectKind,
} from '@odh-dashboard/k8s-core';
import { useHardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '@odh-dashboard/hardware-profiles/shared/kueueUtils';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import HardwareProfileSelect from '#~/concepts/hardwareProfiles/HardwareProfileSelect';

jest.mock('@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig');

jest.mock('@odh-dashboard/hardware-profiles/shared/kueueUtils', () => ({
  ...jest.requireActual('@odh-dashboard/hardware-profiles/shared/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

const useHardwareProfileConfigMock = jest.mocked(useHardwareProfileConfig);
const useKueueConfigurationMock = jest.mocked(useKueueConfiguration);

const kueueHardwareProfile = mockHardwareProfile({
  name: 'kueue-profile',
  displayName: 'Kueue Profile',
});
kueueHardwareProfile.spec.scheduling = {
  type: SchedulingType.QUEUE,
  kueue: {
    localQueueName: 'test-queue',
    priorityClass: 'high-priority',
  },
};

const kueueHardwareProfile2 = mockHardwareProfile({
  name: 'kueue-profile-2',
  displayName: 'Kueue Profile 2',
});
kueueHardwareProfile2.spec.scheduling = {
  type: SchedulingType.QUEUE,
  kueue: {
    localQueueName: 'test-queue-2',
    priorityClass: 'high-priority',
  },
};

// Extra profile sharing test-queue-2 — keeps the dropdown interactive in filtering tests
// (SimpleSelect auto-selects and locks when there's only one option).
const kueueHardwareProfile3 = mockHardwareProfile({
  name: 'kueue-profile-3',
  displayName: 'Kueue Profile 3',
});
kueueHardwareProfile3.spec.scheduling = {
  type: SchedulingType.QUEUE,
  kueue: {
    localQueueName: 'test-queue-2',
    priorityClass: 'normal-priority',
  },
};

const nodeHardwareProfile = mockHardwareProfile({
  name: 'node-profile',
  displayName: 'Node Profile',
});

const nodeHardwareProfile2 = mockHardwareProfile({
  name: 'node-profile-2',
  displayName: 'Node Profile 2',
});

const mockProfiles = [
  kueueHardwareProfile,
  kueueHardwareProfile2,
  nodeHardwareProfile,
  nodeHardwareProfile2,
];

const renderComponent = (
  hardwareProfiles: HardwareProfileKind[],
  currentProject: ProjectKind,
  kueueFilteringState: KueueFilteringState,
  projects: ProjectKind[] = [],
  projectProp?: string,
  allowExistingSettings = false,
  localQueuesOverride?: ProjectDetailsContextType['localQueues'],
  initialHardwareProfile?: HardwareProfileKind,
) => {
  // Mock useKueueConfiguration to return the specified filtering state
  useKueueConfigurationMock.mockReturnValue({
    isKueueDisabled: false,
    isKueueFeatureEnabled: true,
    isProjectKueueEnabled: false,
    kueueFilteringState,
  });

  const hardwareProfileConfig = {
    formData: {
      useExistingSettings: false,
    },
    useExistingSettings: false,
    setFormData: () => null,
    resetFormData: () => null,
    isFormDataValid: true,
    profilesLoaded: true,
    profilesLoadError: undefined,
    initialHardwareProfile: undefined,
  };

  useHardwareProfileConfigMock.mockReturnValue(hardwareProfileConfig);

  // Use the same default shape as the real ProjectsContext to prevent runtime crashes
  const defaultProjectsContextValue = {
    projects: [],
    modelServingProjects: [],
    nonActiveProjects: [],
    preferredProject: null,
    updatePreferredProject: () => undefined,
    loaded: false,
    loadError: new Error('Not in project provider'),
    waitForProject: () => Promise.resolve(),
  };

  return render(
    <ProjectsContext.Provider
      value={{
        ...defaultProjectsContextValue,
        projects,
        loaded: true,
        loadError: undefined,
      }}
    >
      <ProjectDetailsContext.Provider
        value={
          {
            currentProject,
            refresh: jest.fn(),
            localQueues: localQueuesOverride ?? DEFAULT_LIST_FETCH_STATE,
          } as unknown as ProjectDetailsContextType
        }
      >
        <HardwareProfileSelect
          initialHardwareProfile={initialHardwareProfile}
          previewDescription={false}
          hardwareProfiles={hardwareProfiles}
          isProjectScoped={false}
          hardwareProfilesLoaded
          hardwareProfilesError={undefined}
          projectScopedHardwareProfiles={[[], true, undefined]}
          allowExistingSettings={allowExistingSettings}
          hardwareProfileConfig={hardwareProfileConfig}
          isHardwareProfileSupported={() => true}
          onChange={() => null}
          project={projectProp}
        />
      </ProjectDetailsContext.Provider>
    </ProjectsContext.Provider>,
  );
};

describe('HardwareProfileSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Filtering', () => {
    it('should show only Kueue profiles when state is ONLY_KUEUE_PROFILES', async () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.ONLY_KUEUE_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      // Should show Kueue profiles
      expect(screen.getByText('Kueue Profile')).toBeInTheDocument();
      expect(screen.getByText('Kueue Profile 2')).toBeInTheDocument();

      // Should hide non-Kueue profiles
      expect(screen.queryByText('Node Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Node Profile 2')).not.toBeInTheDocument();
    });

    it('should show only non-Kueue profiles when state is ONLY_NON_KUEUE_PROFILES', async () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.ONLY_NON_KUEUE_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      // Should hide Kueue profiles
      expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();

      // Should show non-Kueue profiles
      expect(screen.getByText('Node Profile')).toBeInTheDocument();
      expect(screen.getByText('Node Profile 2')).toBeInTheDocument();
    });

    it('should show no profiles when state is NO_PROFILES', async () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.NO_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      // Should hide all profiles
      expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Node Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Node Profile 2')).not.toBeInTheDocument();
    });

    it('should show only Kueue profiles when Kueue is globally enabled and project is Kueue-enabled', async () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.ONLY_KUEUE_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      expect(screen.getByText('Kueue Profile')).toBeInTheDocument();
      expect(screen.getByText('Kueue Profile 2')).toBeInTheDocument();
      expect(screen.queryByText('Node Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Node Profile 2')).not.toBeInTheDocument();
    });

    it('should show only non-Kueue profiles when Kueue is globally disabled and project is non-Kueue', async () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.ONLY_NON_KUEUE_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();
      expect(screen.getByText('Node Profile')).toBeInTheDocument();
      expect(screen.getByText('Node Profile 2')).toBeInTheDocument();
    });

    it('should show only non-Kueue profiles when Kueue is globally enabled and project is non-Kueue', async () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.ONLY_NON_KUEUE_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();
      expect(screen.getByText('Node Profile')).toBeInTheDocument();
      expect(screen.getByText('Node Profile 2')).toBeInTheDocument();
    });

    it('should show no profiles when Kueue is globally disabled and project is Kueue-enabled', async () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.NO_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Node Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Node Profile 2')).not.toBeInTheDocument();
    });

    it('should handle only Kueue profiles when filtering for non-Kueue', async () => {
      const kueueOnlyProfiles = [kueueHardwareProfile, kueueHardwareProfile2];
      const project = mockProjectK8sResource({});
      renderComponent(kueueOnlyProfiles, project, KueueFilteringState.ONLY_NON_KUEUE_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      // Should show no profiles since all are Kueue profiles
      expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();
    });

    it('should handle only non-Kueue profiles when filtering for Kueue', async () => {
      const nonKueueOnlyProfiles = [nodeHardwareProfile, nodeHardwareProfile2];
      const project = mockProjectK8sResource({});
      renderComponent(nonKueueOnlyProfiles, project, KueueFilteringState.ONLY_KUEUE_PROFILES);

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      // Should show no profiles since all are non-Kueue profiles
      expect(screen.queryByText('Node Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Node Profile 2')).not.toBeInTheDocument();
    });

    it('should show appropriate message when no Kueue profiles are available', () => {
      const nonKueueOnlyProfiles = [nodeHardwareProfile, nodeHardwareProfile2];
      const project = mockProjectK8sResource({});
      renderComponent(nonKueueOnlyProfiles, project, KueueFilteringState.ONLY_KUEUE_PROFILES);

      // Should show generic message
      expect(screen.getByRole('button')).toHaveTextContent(
        'No enabled or valid hardware profiles are available. Contact your administrator.',
      );
    });

    it('should show appropriate message when Kueue is disabled for Kueue-enabled project', () => {
      const project = mockProjectK8sResource({});
      renderComponent(mockProfiles, project, KueueFilteringState.NO_PROFILES);

      // Should show generic message
      expect(screen.getByRole('button')).toHaveTextContent(
        'No enabled or valid hardware profiles are available. Contact your administrator.',
      );
    });
  });
});

describe('HardwareProfileSelect - Use existing settings', () => {
  it('should not show "Use existing settings" as the first option when allowExistingSettings is false', async () => {
    const project = mockProjectK8sResource({});
    renderComponent(
      [nodeHardwareProfile, nodeHardwareProfile2],
      project,
      KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
      [],
      undefined,
      false,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    const options = screen.getAllByRole('option');
    expect(screen.queryByText('Use existing settings')).not.toBeInTheDocument();
    expect(options[0]).toHaveTextContent('Node Profile');
    expect(options[1]).toHaveTextContent('Node Profile 2');
  });

  it('should show "Use existing settings" as the first option when allowExistingSettings is true', async () => {
    const project = mockProjectK8sResource({});
    project.metadata.labels ??= {};
    project.metadata.labels[KnownLabels.KUEUE_MANAGED] = 'true';

    renderComponent(
      [nodeHardwareProfile, nodeHardwareProfile2],
      project,
      KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
      [],
      undefined,
      true,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Use existing settings');
    expect(options[1]).toHaveTextContent('Node Profile');
    expect(options[2]).toHaveTextContent('Node Profile 2');
  });

  it('should use SimpleSelect when disableProjectScoped=false but all profiles filtered by Kueue', () => {
    const projectHardwareProfile = mockHardwareProfile({
      name: 'project-profile',
      displayName: 'Project Profile',
      namespace: 'test-project',
    });
    const project = mockProjectK8sResource({ k8sName: 'test-project' });
    const projects = [project];

    renderComponent(
      [projectHardwareProfile, nodeHardwareProfile], // Has project-scoped profiles
      project,
      KueueFilteringState.NO_PROFILES, // But Kueue filters them all out
      projects,
      'test-project', // Project prop passed
      false, // allowExistingSettings = false, so disableProjectScoped = false
    );

    // Should fall back to SimpleSelect with generic message
    expect(screen.getByRole('button')).toHaveTextContent(
      'No enabled or valid hardware profiles are available. Contact your administrator.',
    );
  });
});

describe('HardwareProfileSelect - LocalQueue availability filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hide Kueue profiles whose localQueue does not exist in the project', async () => {
    const project = mockProjectK8sResource({});
    // Only 'test-queue-2' exists in the project. kueueHardwareProfile ('test-queue') is absent.
    // Include kueueHardwareProfile3 (also 'test-queue-2') so there are 2 visible options and
    // SimpleSelect stays interactive (it auto-selects + disables when only 1 option exists).
    const localQueues = {
      data: [mockLocalQueueK8sResource({ name: 'test-queue-2' })],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    };
    const profilesForTest = [
      kueueHardwareProfile,
      kueueHardwareProfile2,
      kueueHardwareProfile3,
      nodeHardwareProfile,
    ];

    renderComponent(
      profilesForTest,
      project,
      KueueFilteringState.ONLY_KUEUE_PROFILES,
      [],
      undefined,
      false,
      localQueues,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    // test-queue-2 exists → profiles 2 and 3 are shown
    expect(screen.getByText('Kueue Profile 2')).toBeInTheDocument();
    expect(screen.getByText('Kueue Profile 3')).toBeInTheDocument();
    // test-queue does not exist → profile 1 hidden; non-Kueue also hidden
    expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Node Profile')).not.toBeInTheDocument();
  });

  it('should show all Kueue profiles when their localQueues all exist in the project', async () => {
    const project = mockProjectK8sResource({});
    const localQueues = {
      data: [
        mockLocalQueueK8sResource({ name: 'test-queue' }),
        mockLocalQueueK8sResource({ name: 'test-queue-2' }),
      ],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    };

    renderComponent(
      mockProfiles,
      project,
      KueueFilteringState.ONLY_KUEUE_PROFILES,
      [],
      undefined,
      false,
      localQueues,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    expect(screen.getByText('Kueue Profile')).toBeInTheDocument();
    expect(screen.getByText('Kueue Profile 2')).toBeInTheDocument();
  });

  it('should show all Kueue profiles while localQueues are still loading (no premature filtering)', async () => {
    const project = mockProjectK8sResource({});
    // loaded: false simulates data still in flight — no filtering should happen yet
    const localQueues = {
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    };

    renderComponent(
      mockProfiles,
      project,
      KueueFilteringState.ONLY_KUEUE_PROFILES,
      [],
      undefined,
      false,
      localQueues,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    // Both Kueue profiles must still be visible while queues are loading
    expect(screen.getByText('Kueue Profile')).toBeInTheDocument();
    expect(screen.getByText('Kueue Profile 2')).toBeInTheDocument();
  });

  it('should not duplicate initialHardwareProfile across both groups when its localQueue is missing (project-scoped edit mode)', async () => {
    const project = mockProjectK8sResource({ k8sName: 'test-project' });

    // Project-scoped profile whose queue is absent — the previously saved selection in edit mode
    const projectKueueProfile = mockHardwareProfile({
      name: 'project-kueue-profile',
      displayName: 'Project Kueue Profile',
      namespace: 'test-project',
    });
    projectKueueProfile.spec.scheduling = {
      type: SchedulingType.QUEUE,
      kueue: { localQueueName: 'test-queue', priorityClass: 'high-priority' },
    };

    // Global profile with an existing queue — anchors the global group so it renders
    const globalKueueProfile = mockHardwareProfile({
      name: 'global-kueue-profile',
      displayName: 'Global Kueue Profile',
    });
    globalKueueProfile.spec.scheduling = {
      type: SchedulingType.QUEUE,
      kueue: { localQueueName: 'test-queue-2', priorityClass: 'normal-priority' },
    };

    // 'test-queue' is absent; 'test-queue-2' exists
    const localQueues = {
      data: [mockLocalQueueK8sResource({ name: 'test-queue-2' })],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    };

    useKueueConfigurationMock.mockReturnValue({
      isKueueDisabled: false,
      isKueueFeatureEnabled: true,
      isProjectKueueEnabled: true,
      kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
    });

    const hardwareProfileConfig = {
      formData: { useExistingSettings: false },
      useExistingSettings: false,
      setFormData: () => null,
      resetFormData: () => null,
      isFormDataValid: true,
      profilesLoaded: true,
      profilesLoadError: undefined,
      initialHardwareProfile: undefined,
    };
    useHardwareProfileConfigMock.mockReturnValue(hardwareProfileConfig);

    render(
      <ProjectsContext.Provider
        value={{
          projects: [project],
          modelServingProjects: [],
          nonActiveProjects: [],
          preferredProject: null,
          updatePreferredProject: () => undefined,
          loaded: true,
          loadError: undefined,
          waitForProject: () => Promise.resolve(),
        }}
      >
        <ProjectDetailsContext.Provider
          value={
            {
              currentProject: project,
              refresh: jest.fn(),
              localQueues,
            } as unknown as ProjectDetailsContextType
          }
        >
          <HardwareProfileSelect
            isProjectScoped
            initialHardwareProfile={projectKueueProfile}
            previewDescription={false}
            hardwareProfiles={[globalKueueProfile]}
            hardwareProfilesLoaded
            hardwareProfilesError={undefined}
            projectScopedHardwareProfiles={[[projectKueueProfile], true, undefined]}
            allowExistingSettings={false}
            hardwareProfileConfig={hardwareProfileConfig}
            isHardwareProfileSupported={() => true}
            onChange={() => null}
            project="test-project"
          />
        </ProjectDetailsContext.Provider>
      </ProjectsContext.Provider>,
    );

    await userEvent.click(screen.getByTestId('hardware-profile-selection-toggle'));

    // Rescued profile appears exactly once — in the project group, not the global group
    expect(screen.getAllByText('Project Kueue Profile')).toHaveLength(1);
    expect(screen.getByTestId('project-scoped-hardware-profiles')).toHaveTextContent(
      'Project Kueue Profile',
    );
    expect(screen.getByTestId('global-scoped-hardware-profiles')).not.toHaveTextContent(
      'Project Kueue Profile',
    );
    expect(screen.getByTestId('global-scoped-hardware-profiles')).toHaveTextContent(
      'Global Kueue Profile',
    );
  });

  it('should keep initialHardwareProfile in options even when its localQueue is missing (edit mode)', async () => {
    const project = mockProjectK8sResource({});
    // Only 'test-queue-2' exists — kueueHardwareProfile's 'test-queue' is absent.
    // kueueHardwareProfile2 stays visible because its queue exists, giving us 2 options
    // so SimpleSelect stays interactive (it auto-selects + disables at exactly 1 option).
    const localQueues = {
      data: [mockLocalQueueK8sResource({ name: 'test-queue-2' })],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    };

    // Edit mode: initialHardwareProfile is the previously saved profile (queue is missing)
    renderComponent(
      [kueueHardwareProfile, kueueHardwareProfile2],
      project,
      KueueFilteringState.ONLY_KUEUE_PROFILES,
      [],
      undefined,
      false,
      localQueues,
      kueueHardwareProfile, // initialHardwareProfile — queue 'test-queue' is absent
    );

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    // initialHardwareProfile must remain visible even though its queue is missing
    expect(screen.getByText('Kueue Profile')).toBeInTheDocument();
    // kueueHardwareProfile2's queue exists → it is also shown normally
    expect(screen.getByText('Kueue Profile 2')).toBeInTheDocument();
    // info icon shown only for the profile with the missing queue
    expect(screen.getByTestId('queue-missing-icon')).toBeInTheDocument();
  });
});
