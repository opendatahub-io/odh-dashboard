import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { HardwareProfileKind, ProjectKind, KnownLabels } from '#~/k8sTypes';
import { SchedulingType } from '#~/types';
import { useHardwareProfileConfig } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import HardwareProfileSelect from '#~/concepts/hardwareProfiles/HardwareProfileSelect';
import { useKueueConfiguration, KueueFilteringState } from '#~/kueueUtils';

jest.mock('#~/concepts/hardwareProfiles/useHardwareProfileConfig');

jest.mock('#~/kueueUtils', () => ({
  ...jest.requireActual('#~/kueueUtils'),
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

  return render(
    <ProjectsContext.Provider
      value={{
        projects,
        modelServingProjects: [],
        nonActiveProjects: [],
        preferredProject: null,
        updatePreferredProject: jest.fn(),
        waitForProject: jest.fn().mockResolvedValue(undefined),
        loaded: true,
        loadError: undefined,
      }}
    >
      <ProjectDetailsContext.Provider
        value={
          {
            currentProject,
            refresh: jest.fn(),
          } as unknown as ProjectDetailsContextType
        }
      >
        <HardwareProfileSelect
          initialHardwareProfile={undefined}
          previewDescription={false}
          hardwareProfiles={hardwareProfiles}
          isProjectScoped={false}
          hardwareProfilesLoaded
          hardwareProfilesError={undefined}
          projectScopedHardwareProfiles={[[], true, undefined, () => Promise.resolve()]}
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
