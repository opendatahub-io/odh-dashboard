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
import { useIsAreaAvailable } from '#~/concepts/areas';
import { HardwareProfileKind, KnownLabels, ProjectKind } from '#~/k8sTypes';
import { SchedulingType } from '#~/types';
import { useHardwareProfileConfig } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import HardwareProfileSelect from '#~/concepts/hardwareProfiles/HardwareProfileSelect';

jest.mock('#~/concepts/areas', () => ({
  ...jest.requireActual('#~/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('#~/concepts/hardwareProfiles/useHardwareProfileConfig');

const useIsAreaAvailableMock = jest.mocked(useIsAreaAvailable);
const useHardwareProfileConfigMock = jest.mocked(useHardwareProfileConfig);

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
  isKueueEnabled: boolean,
) => {
  useIsAreaAvailableMock.mockReturnValue({
    status: isKueueEnabled,
    devFlags: {},
    featureFlags: {},
    reliantAreas: {},
    requiredComponents: {},
    requiredCapabilities: {},
    customCondition: () => false,
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
        allowExistingSettings={false}
        hardwareProfileConfig={hardwareProfileConfig}
        isHardwareProfileSupported={() => true}
        onChange={() => null}
        project="test-project"
      />
    </ProjectDetailsContext.Provider>,
  );
};

describe('HardwareProfileSelect filtering', () => {
  it('should filter out kueue profiles when kueue is disabled cluster-wide', async () => {
    const project = mockProjectK8sResource({});
    renderComponent(mockProfiles, project, false);

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();
    expect(screen.getByText('Node Profile')).toBeInTheDocument();
    expect(screen.getByText('Node Profile 2')).toBeInTheDocument();
  });

  it('should filter out kueue profiles when project is not kueue-enabled', async () => {
    const project = mockProjectK8sResource({});
    renderComponent(mockProfiles, project, true);

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    expect(screen.queryByText('Kueue Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Kueue Profile 2')).not.toBeInTheDocument();
    expect(screen.getByText('Node Profile')).toBeInTheDocument();
    expect(screen.getByText('Node Profile 2')).toBeInTheDocument();
  });

  it('should show kueue profiles when kueue is enabled for cluster and project', async () => {
    const project = mockProjectK8sResource({});
    project.metadata.labels ??= {};
    project.metadata.labels[KnownLabels.KUEUE_MANAGED] = 'true';
    renderComponent(mockProfiles, project, true);

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

    expect(screen.getByText('Kueue Profile')).toBeInTheDocument();
    expect(screen.getByText('Kueue Profile 2')).toBeInTheDocument();
    expect(screen.getByText('Node Profile')).toBeInTheDocument();
    expect(screen.getByText('Node Profile 2')).toBeInTheDocument();
  });
});
