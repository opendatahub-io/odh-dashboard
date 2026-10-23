import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import type { ContainerResources, HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useHardwareProfilesByFeatureVisibility } from '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '@odh-dashboard/hardware-profiles/shared/kueueUtils';
import { useResourceClaimTemplateNames } from '@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames';
import type { HardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig';
import { DEFAULT_LIST_FETCH_STATE } from '@odh-dashboard/ui-core/utilities/fetchState';
import { CurrentProjectContext } from '@odh-dashboard/ui-core/context/CurrentProjectContext';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import HardwareProfileFormSection from '#~/concepts/hardwareProfiles/HardwareProfileFormSection';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility', () => ({
  useHardwareProfilesByFeatureVisibility: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/shared/kueueUtils', () => ({
  ...jest.requireActual('@odh-dashboard/hardware-profiles/shared/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames', () => ({
  useResourceClaimTemplateNames: jest.fn(),
}));

const useIsAreaAvailableMock = jest.mocked(useIsAreaAvailable);
const useHardwareProfilesByFeatureVisibilityMock = jest.mocked(
  useHardwareProfilesByFeatureVisibility,
);
const useKueueConfigurationMock = jest.mocked(useKueueConfiguration);
const useResourceClaimTemplateNamesMock = jest.mocked(useResourceClaimTemplateNames);

const regularProfile = () =>
  mockHardwareProfile({ name: 'regular-profile', displayName: 'Regular Profile' });

const draProfile = () =>
  mockHardwareProfile({
    name: 'dra-profile',
    displayName: 'DRA Profile',
    dra: { resourceClaimTemplateName: 'single-gpu' },
  });

const draWorkloadResources = (): ContainerResources => ({
  requests: { cpu: '4', memory: '8Gi' },
  limits: { cpu: '4', memory: '8Gi' },
  claims: [{ name: 'hwp-dra' }],
});

const renderFormSection = ({
  hardwareProfiles,
  formData,
  initialHardwareProfile,
  initialResources,
  excludeDRAProfiles = false,
  claimTemplateMissingText,
}: {
  hardwareProfiles: HardwareProfileKind[];
  formData: HardwareProfileConfig;
  initialHardwareProfile?: HardwareProfileKind;
  initialResources?: ContainerResources;
  excludeDRAProfiles?: boolean;
  claimTemplateMissingText?: string;
}) => {
  const setFormData = jest.fn();
  useHardwareProfilesByFeatureVisibilityMock.mockReturnValue({
    globalProfiles: [hardwareProfiles, true, undefined],
    projectProfiles: [[], true, undefined],
  });
  const project = mockProjectK8sResource({});

  render(
    <CurrentProjectContext.Provider value={{ currentProject: project }}>
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
        <LocalQueuesContext.Provider value={{ localQueues: DEFAULT_LIST_FETCH_STATE }}>
          <HardwareProfileFormSection
            isEditing
            isHardwareProfileSupported={() => true}
            podSpecOptionsState={{
              hardwareProfile: {
                formData,
                initialHardwareProfile,
                initialResources,
                excludeDRAProfiles,
                existingBinding: {},
                claimTemplateMissingText,
                setFormData,
                resetFormData: jest.fn(),
                isFormDataValid: true,
                profilesLoaded: true,
              },
              podSpecOptions: { resources: formData.resources },
            }}
          />
        </LocalQueuesContext.Provider>
      </ProjectsContext.Provider>
    </CurrentProjectContext.Provider>,
  );

  return setFormData;
};

describe('HardwareProfileFormSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsAreaAvailableMock.mockReturnValue({ status: false } as ReturnType<
      typeof useIsAreaAvailable
    >);
    useKueueConfigurationMock.mockReturnValue({
      isKueueDisabled: false,
      isKueueFeatureEnabled: true,
      isProjectKueueEnabled: false,
      kueueFilteringState: KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
    });
    useResourceClaimTemplateNamesMock.mockReturnValue({ status: 'unavailable' });
  });

  it('should carry the existing claims to the defaults of a newly selected profile', async () => {
    const dra = draProfile();
    const regular = regularProfile();
    const setFormData = renderFormSection({
      hardwareProfiles: [dra, regular],
      formData: {
        selectedProfile: dra,
        useExistingSettings: false,
        resources: draWorkloadResources(),
      },
      initialHardwareProfile: dra,
      initialResources: draWorkloadResources(),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    await userEvent.click(screen.getByRole('option', { name: /Regular Profile/ }));

    expect(setFormData.mock.calls).toStrictEqual([
      ['selectedProfile', regular],
      ['useExistingSettings', false],
      [
        'resources',
        {
          requests: { memory: '2Gi', cpu: '1' },
          limits: { memory: '2Gi', cpu: '1' },
          claims: [{ name: 'hwp-dra' }],
        },
      ],
    ]);
  });

  it('should restore the initial resources when the initial DRA profile is selected again', async () => {
    const dra = draProfile();
    const regular = regularProfile();
    const initialResources = draWorkloadResources();
    const setFormData = renderFormSection({
      hardwareProfiles: [dra, regular],
      formData: {
        selectedProfile: regular,
        useExistingSettings: false,
        resources: {
          requests: { memory: '2Gi', cpu: '1' },
          limits: { memory: '2Gi', cpu: '1' },
          claims: [{ name: 'hwp-dra' }],
        },
      },
      initialHardwareProfile: dra,
      initialResources,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    await userEvent.click(screen.getByRole('option', { name: /DRA Profile/ }));

    expect(setFormData.mock.calls).toStrictEqual([
      ['selectedProfile', dra],
      ['useExistingSettings', false],
      ['resources', initialResources],
    ]);
    expect(setFormData.mock.calls[2][1]).toBe(initialResources);
  });

  it('should keep the customized resources when the selected DRA profile is selected again', async () => {
    const dra = draProfile();
    const regular = regularProfile();
    const setFormData = renderFormSection({
      hardwareProfiles: [dra, regular],
      formData: {
        selectedProfile: dra,
        useExistingSettings: false,
        resources: {
          requests: { memory: '6Gi', cpu: '3' },
          limits: { memory: '6Gi', cpu: '3' },
          claims: [{ name: 'hwp-dra' }],
        },
      },
      initialHardwareProfile: dra,
      initialResources: draWorkloadResources(),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    await userEvent.click(screen.getByRole('option', { name: /DRA Profile/ }));

    expect(setFormData).not.toHaveBeenCalled();
  });

  it('should use the existing settings when no profile is selected', async () => {
    const regular = regularProfile();
    const setFormData = renderFormSection({
      hardwareProfiles: [regular, draProfile()],
      formData: {
        selectedProfile: regular,
        useExistingSettings: false,
        resources: {
          requests: { memory: '2Gi', cpu: '1' },
          limits: { memory: '2Gi', cpu: '1' },
        },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
    await userEvent.click(screen.getByRole('option', { name: /Use existing settings/ }));

    expect(setFormData.mock.calls).toStrictEqual([
      ['selectedProfile', undefined],
      ['useExistingSettings', true],
    ]);
  });

  it('should offer DRA profiles that are valid when the config does not exclude them', () => {
    renderFormSection({
      hardwareProfiles: [regularProfile()],
      formData: { selectedProfile: undefined, useExistingSettings: false },
    });

    expect(useHardwareProfilesByFeatureVisibilityMock).toHaveBeenCalledWith([], undefined, {
      dra: 'valid',
    });
  });

  describe('when the config excludes DRA profiles', () => {
    it('should not offer DRA profiles', () => {
      renderFormSection({
        hardwareProfiles: [regularProfile()],
        formData: { selectedProfile: undefined, useExistingSettings: false },
        excludeDRAProfiles: true,
      });

      expect(useHardwareProfilesByFeatureVisibilityMock).toHaveBeenCalledWith([], undefined, {
        dra: 'none',
      });
    });

    it('should lock an assigned DRA profile and keep its settings when it is selected again', async () => {
      const dra = draProfile();
      const setFormData = renderFormSection({
        hardwareProfiles: [regularProfile()],
        formData: {
          selectedProfile: dra,
          useExistingSettings: true,
          resources: draWorkloadResources(),
        },
        initialHardwareProfile: dra,
        initialResources: draWorkloadResources(),
        excludeDRAProfiles: true,
      });

      expect(screen.getByTestId('dra-hardware-profile-locked')).toBeInTheDocument();
      expect(screen.queryByTestId('hardware-profile-customize')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
      await userEvent.click(screen.getByRole('option', { name: /DRA Profile/ }));

      expect(setFormData).not.toHaveBeenCalled();
    });

    it('should not show the claim template of an assigned DRA profile when DRA hardware profiles are disabled', async () => {
      const dra = draProfile();
      renderFormSection({
        hardwareProfiles: [regularProfile()],
        formData: {
          selectedProfile: dra,
          useExistingSettings: true,
          resources: draWorkloadResources(),
        },
        initialHardwareProfile: dra,
        initialResources: draWorkloadResources(),
        excludeDRAProfiles: true,
      });

      expect(screen.getByTestId('dra-hardware-profile-locked')).toBeInTheDocument();
      expect(screen.queryByText(/Claim template/)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));

      const assignedOption = screen.getByRole('option', { name: /DRA Profile/ });
      expect(assignedOption).not.toHaveTextContent('Claim template');
      expect(screen.queryByText('Tech Preview')).not.toBeInTheDocument();
    });

    it('should switch from an assigned DRA profile to another profile', async () => {
      const dra = draProfile();
      const regular = regularProfile();
      const setFormData = renderFormSection({
        hardwareProfiles: [regular],
        formData: {
          selectedProfile: dra,
          useExistingSettings: true,
          resources: draWorkloadResources(),
        },
        initialHardwareProfile: dra,
        initialResources: draWorkloadResources(),
        excludeDRAProfiles: true,
      });

      await userEvent.click(screen.getByRole('button', { name: 'Options menu' }));
      await userEvent.click(screen.getByRole('option', { name: /Regular Profile/ }));

      expect(setFormData).toHaveBeenCalledWith('selectedProfile', regular);
      expect(setFormData).toHaveBeenCalledWith('useExistingSettings', false);
    });
  });

  describe('validation errors', () => {
    it('should not show a required error while no profile is selected', () => {
      renderFormSection({
        hardwareProfiles: [regularProfile(), draProfile()],
        formData: { selectedProfile: undefined, useExistingSettings: false },
      });

      expect(screen.queryByText('Required')).not.toBeInTheDocument();
    });

    it('should show a required error once a profile is selected without resources', () => {
      renderFormSection({
        hardwareProfiles: [regularProfile()],
        formData: { selectedProfile: regularProfile(), useExistingSettings: false },
      });

      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    it('should show resource errors of the selected profile', () => {
      const regular = regularProfile();
      renderFormSection({
        hardwareProfiles: [regular],
        formData: {
          selectedProfile: regular,
          useExistingSettings: false,
          resources: {
            requests: { cpu: '2', memory: '2Gi' },
            limits: { cpu: '1', memory: '2Gi' },
          },
        },
      });

      expect(
        within(screen.getByTestId('hardware-profile-section')).getAllByText(
          'Limit must be greater than or equal to request',
        ),
      ).toHaveLength(2);
    });

    it('should show the claim template error of the selected profile', () => {
      const dra = draProfile();
      const claimTemplateMissingText =
        'The claim template single-gpu does not exist in this project. Ask your administrator to create it, or select a different hardware profile.';
      renderFormSection({
        hardwareProfiles: [regularProfile(), dra],
        formData: {
          selectedProfile: dra,
          useExistingSettings: false,
          resources: { requests: {}, limits: {} },
        },
        claimTemplateMissingText,
      });

      expect(screen.getByTestId('hardware-profile-claim-template-missing')).toHaveTextContent(
        claimTemplateMissingText,
      );
    });

    it('should not show a claim template error without one', () => {
      const dra = draProfile();
      renderFormSection({
        hardwareProfiles: [regularProfile(), dra],
        formData: {
          selectedProfile: dra,
          useExistingSettings: false,
          resources: { requests: {}, limits: {} },
        },
      });

      expect(
        screen.queryByTestId('hardware-profile-claim-template-missing'),
      ).not.toBeInTheDocument();
    });
  });
});
