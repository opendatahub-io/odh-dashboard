import * as React from 'react';
import { act } from '@testing-library/react';
import { renderHook, testHook } from '@odh-dashboard/jest-config/hooks';
import * as pluginCore from '@odh-dashboard/plugin-core';
import * as areasUtils from '@odh-dashboard/plugin-core/areas';
import { SchedulingType } from '@odh-dashboard/k8s-core';
import { CurrentProjectContext } from '@odh-dashboard/ui-core/context/CurrentProjectContext';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import type { LocalQueuesContextType } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useResourceClaimTemplateNames } from '@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames';
import * as useHardwareProfilesModule from '@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import { useHardwareProfileConfig } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import { getContainerResourcesFromHardwareProfile } from '#~/concepts/hardwareProfiles/utils';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core'),
  useDashboardNamespace: jest.fn(),
}));

jest.mock('@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility');

jest.mock('@odh-dashboard/hardware-profiles/shared/useResourceClaimTemplateNames', () => ({
  useResourceClaimTemplateNames: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);
const mockUseHardwareProfiles = jest.mocked(
  useHardwareProfilesModule.useHardwareProfilesByFeatureVisibility,
);
const mockUseDashboardNamespace = jest.mocked(pluginCore.useDashboardNamespace);
const mockUseResourceClaimTemplateNames = jest.mocked(useResourceClaimTemplateNames);

describe('useHardwareProfileConfig', () => {
  beforeEach(() => {
    mockUseResourceClaimTemplateNames.mockReturnValue({ status: 'unavailable' });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[], true, undefined],
    });
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });
  });

  it('should initialize with default values', () => {
    const renderResult = testHook(useHardwareProfileConfig)();
    const state = renderResult.result.current;

    expect(state).toEqual({
      formData: {
        selectedProfile: undefined,
        useExistingSettings: false,
      },
      initialHardwareProfile: undefined,
      existingBinding: { name: undefined, namespace: undefined },
      excludeDRAProfiles: true,
      isFormDataValid: false,
      setFormData: expect.any(Function),
      resetFormData: expect.any(Function),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
  });

  it('should match hardware profile based on resources and tolerations', () => {
    const hardwareProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '100m',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '1',
        },
        {
          identifier: 'memory',
          minCount: '100Mi',
          maxCount: '4Gi',
          displayName: 'Memory',
          defaultCount: '1Gi',
        },
      ],
      tolerations: [{ key: 'key1', value: 'value1' }],
      nodeSelector: { node: 'value1' },
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[hardwareProfile], true, undefined],
    });

    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
    };
    const tolerations = [{ key: 'key1', value: 'value1' }];
    const nodeSelector = { node: 'value1' };

    const renderResult = testHook(useHardwareProfileConfig)(
      undefined,
      resources,
      tolerations,
      nodeSelector,
    );
    const state = renderResult.result.current;

    expect(state).toEqual({
      formData: {
        selectedProfile: hardwareProfile,
        useExistingSettings: false,
        resources,
      },
      initialHardwareProfile: hardwareProfile,
      existingBinding: { name: undefined, namespace: undefined },
      excludeDRAProfiles: true,
      isFormDataValid: true,
      setFormData: expect.any(Function),
      resetFormData: expect.any(Function),
      profilesLoaded: true,
      profilesLoadError: undefined,
    });
  });

  it('should find profile by name when existingHardwareProfileName is provided', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[hardwareProfile], true, undefined],
    });

    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'test-profile',
      resources,
      undefined,
      undefined,
      undefined,
      undefined,
      hardwareProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(hardwareProfile);
    expect(state.initialHardwareProfile).toBe(hardwareProfile);
  });

  it.each([
    ['empty resources', {}],
    ['no resources', undefined],
  ])(
    'should select an assigned DRA hardware profile without identifiers, with %s',
    (_, resources) => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        identifiers: [],
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
      const { filterHardwareProfileByFeatureVisibility } = jest.requireActual<
        typeof useHardwareProfilesModule
      >('@odh-dashboard/hardware-profiles/pages/useHardwareProfilesByFeatureVisibility');
      mockUseHardwareProfiles.mockImplementation((visibility, _namespace, options) => ({
        projectProfiles: [[], true, undefined],
        globalProfiles: [
          filterHardwareProfileByFeatureVisibility(
            [regularProfile, draProfile],
            visibility,
            options?.dra,
          ),
          true,
          undefined,
        ],
      }));

      const renderResult = testHook(useHardwareProfileConfig)(
        'dra-profile',
        resources,
        undefined,
        undefined,
        undefined,
        undefined,
        draProfile.metadata.namespace,
        { allowDRAProfiles: true },
      );
      const state = renderResult.result.current;

      expect(state.formData).toEqual({
        selectedProfile: draProfile,
        useExistingSettings: false,
        resources: { requests: {}, limits: {} },
      });
      expect(state.initialHardwareProfile).toBe(draProfile);
      expect(state.initialResources).toEqual({ requests: {}, limits: {} });
      expect(state.isFormDataValid).toBe(true);
    },
  );

  it('should keep the existing resources and claims of a workload assigned a DRA hardware profile without identifiers', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[draProfile], true, undefined],
    });
    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
      claims: [{ name: 'hwp-dra' }],
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'dra-profile',
      resources,
      undefined,
      undefined,
      undefined,
      undefined,
      draProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(draProfile);
    expect(state.formData.resources).toEqual(resources);
    expect(state.initialResources).toEqual(resources);
  });

  it('should use the existing settings of a workload assigned a DRA hardware profile when DRA profiles are excluded', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[draProfile], true, undefined],
    });
    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
      claims: [{ name: 'hwp-dra' }],
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'dra-profile',
      resources,
      undefined,
      undefined,
      undefined,
      undefined,
      draProfile.metadata.namespace,
      { allowDRAProfiles: false },
    );
    const state = renderResult.result.current;

    expect(mockUseHardwareProfiles).toHaveBeenCalledWith(undefined, undefined, { dra: 'all' });
    expect(state.formData).toEqual({
      selectedProfile: draProfile,
      useExistingSettings: true,
      resources,
    });
    expect(state.initialHardwareProfile).toBe(draProfile);
    expect(state.isFormDataValid).toBe(true);
  });

  it('should not auto-select a DRA hardware profile for a new workload when DRA profiles are excluded', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[draProfile, regularProfile], true, undefined],
    });

    const renderResult = testHook(useHardwareProfileConfig)(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { allowDRAProfiles: false },
    );

    expect(renderResult.result.current.formData.selectedProfile).toBe(regularProfile);
    expect(renderResult.result.current.formData.useExistingSettings).toBe(false);
  });

  describe('DRA hardware profile selection', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
      claims: [{ name: 'hwp-dra' }],
    };

    const mockDRASelectionAvailable = (available: boolean) =>
      mockUseIsAreaAvailable.mockImplementation((area) => ({
        status: area === areasUtils.SupportedArea.HARDWARE_PROFILE_DRA ? available : true,
        devFlags: {},
        featureFlags: {},
        reliantAreas: {},
        requiredComponents: {},
        requiredCapabilities: {},
        customCondition: () => false,
      }));

    const renderAssignedDRAWorkload = (options?: { allowDRAProfiles?: boolean }) =>
      testHook(useHardwareProfileConfig)(
        'dra-profile',
        resources,
        undefined,
        undefined,
        undefined,
        undefined,
        draProfile.metadata.namespace,
        options,
      );

    beforeEach(() => {
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[draProfile], true, undefined],
      });
    });

    it('should allow DRA profiles and keep an assigned DRA profile editable when the hardwareProfileDRA flag is on', () => {
      mockDRASelectionAvailable(true);

      const state = renderAssignedDRAWorkload({ allowDRAProfiles: true }).result.current;

      expect(mockUseIsAreaAvailable).toHaveBeenCalledWith(
        areasUtils.SupportedArea.HARDWARE_PROFILE_DRA,
      );
      expect(state.excludeDRAProfiles).toBe(false);
      expect(state.formData).toEqual({
        selectedProfile: draProfile,
        useExistingSettings: false,
        resources,
      });
    });

    it('should exclude DRA profiles and use the existing settings of an assigned DRA profile when the hardwareProfileDRA flag is off', () => {
      mockDRASelectionAvailable(false);

      const state = renderAssignedDRAWorkload({ allowDRAProfiles: true }).result.current;

      expect(state.excludeDRAProfiles).toBe(true);
      expect(state.formData).toEqual({
        selectedProfile: draProfile,
        useExistingSettings: true,
        resources,
      });
    });

    it('should exclude DRA profiles when the caller does not allow them and the hardwareProfileDRA flag is on', () => {
      mockDRASelectionAvailable(true);

      const state = renderAssignedDRAWorkload().result.current;

      expect(state.excludeDRAProfiles).toBe(true);
      expect(state.formData.useExistingSettings).toBe(true);
    });

    it('should use the existing settings of an assigned DRA profile only while the caller excludes DRA profiles', () => {
      mockDRASelectionAvailable(true);
      const renderResult = renderAssignedDRAWorkload({ allowDRAProfiles: false });
      expect(renderResult.result.current.formData.useExistingSettings).toBe(true);

      renderResult.rerender(
        'dra-profile',
        resources,
        undefined,
        undefined,
        undefined,
        undefined,
        draProfile.metadata.namespace,
        { allowDRAProfiles: true },
      );
      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: draProfile,
        useExistingSettings: false,
        resources,
      });

      renderResult.rerender(
        'dra-profile',
        resources,
        undefined,
        undefined,
        undefined,
        undefined,
        draProfile.metadata.namespace,
        { allowDRAProfiles: false },
      );
      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: draProfile,
        useExistingSettings: true,
        resources,
      });
    });

    it('should reset a newly selected DRA profile to the first regular profile when the caller starts excluding DRA profiles', () => {
      mockDRASelectionAvailable(true);
      const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[regularProfile, draProfile], true, undefined],
      });
      const renderResult = testHook(useHardwareProfileConfig)(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { allowDRAProfiles: true },
      );
      expect(renderResult.result.current.formData.selectedProfile).toBe(regularProfile);

      act(() => {
        renderResult.result.current.setFormData('selectedProfile', draProfile);
        renderResult.result.current.setFormData('resources', { requests: {}, limits: {} });
      });
      expect(renderResult.result.current.formData.selectedProfile).toBe(draProfile);

      renderResult.rerender(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { allowDRAProfiles: false },
      );

      expect(renderResult.result.current.excludeDRAProfiles).toBe(true);
      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: regularProfile,
        useExistingSettings: false,
        resources: getContainerResourcesFromHardwareProfile(regularProfile),
      });
    });

    it('should keep a newly selected DRA profile while the caller allows DRA profiles', () => {
      mockDRASelectionAvailable(true);
      const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[regularProfile, draProfile], true, undefined],
      });
      const renderResult = testHook(useHardwareProfileConfig)(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { allowDRAProfiles: true },
      );

      act(() => {
        renderResult.result.current.setFormData('selectedProfile', draProfile);
        renderResult.result.current.setFormData('resources', { requests: {}, limits: {} });
      });
      renderResult.rerender(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { allowDRAProfiles: true },
      );

      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: draProfile,
        useExistingSettings: false,
        resources: { requests: {}, limits: {} },
      });
    });
  });

  describe('DRA support not known yet', () => {
    const draProfileWithIdentifiers = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '1',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '2',
        },
        {
          identifier: 'memory',
          minCount: '1Gi',
          maxCount: '8Gi',
          displayName: 'Memory',
          defaultCount: '2Gi',
        },
      ],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
    const workloadResources = {
      requests: { cpu: '3' },
      limits: { cpu: '3' },
      claims: [{ name: 'hwp-dra' }],
    };

    const renderAssignedWorkload = (allowDRAProfiles: boolean | 'pending') =>
      testHook(useHardwareProfileConfig)(
        'dra-profile',
        workloadResources,
        undefined,
        undefined,
        undefined,
        undefined,
        draProfileWithIdentifiers.metadata.namespace,
        { allowDRAProfiles },
      );

    const rerenderAssignedWorkload = (
      renderResult: ReturnType<typeof renderAssignedWorkload>,
      allowDRAProfiles: boolean | 'pending',
    ) =>
      renderResult.rerender(
        'dra-profile',
        workloadResources,
        undefined,
        undefined,
        undefined,
        undefined,
        draProfileWithIdentifiers.metadata.namespace,
        { allowDRAProfiles },
      );

    const renderNewWorkload = (allowDRAProfiles: boolean | 'pending') =>
      testHook(useHardwareProfileConfig)(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { allowDRAProfiles },
      );

    const rerenderNewWorkload = (
      renderResult: ReturnType<typeof renderNewWorkload>,
      allowDRAProfiles: boolean | 'pending',
    ) =>
      renderResult.rerender(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { allowDRAProfiles },
      );

    beforeEach(() => {
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[regularProfile, draProfileWithIdentifiers], true, undefined],
      });
    });

    it('should not initialise the form while DRA support is not known', () => {
      const assigned = renderAssignedWorkload('pending');
      const newWorkload = renderNewWorkload('pending');

      expect(assigned.result.current.formData).toEqual({
        selectedProfile: undefined,
        useExistingSettings: false,
      });
      expect(assigned.result.current.initialHardwareProfile).toBeUndefined();
      expect(assigned.result.current.excludeDRAProfiles).toBe(true);
      expect(newWorkload.result.current.formData).toEqual({
        selectedProfile: undefined,
        useExistingSettings: false,
      });
    });

    it('should merge the identifiers of an assigned DRA profile the workload lacks once DRA support resolves after the first render', () => {
      const renderResult = renderAssignedWorkload('pending');

      rerenderAssignedWorkload(renderResult, true);

      const expectedResources = {
        requests: { cpu: '3', memory: '2Gi' },
        limits: { cpu: '3', memory: '2Gi' },
        claims: [{ name: 'hwp-dra' }],
      };
      expect(renderResult.result.current.excludeDRAProfiles).toBe(false);
      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: draProfileWithIdentifiers,
        useExistingSettings: false,
        resources: expectedResources,
      });
      expect(renderResult.result.current.initialResources).toEqual(expectedResources);
      expect(renderResult.result.current.isFormDataValid).toBe(true);
    });

    it('should keep the existing resources of an assigned DRA profile once DRA support resolves as not supported', () => {
      const renderResult = renderAssignedWorkload('pending');

      rerenderAssignedWorkload(renderResult, false);

      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: draProfileWithIdentifiers,
        useExistingSettings: true,
        resources: workloadResources,
      });
      expect(renderResult.result.current.isFormDataValid).toBe(true);
    });

    it('should keep a newly selected DRA profile while DRA support is temporarily unknown', () => {
      const renderResult = renderNewWorkload('pending');
      rerenderNewWorkload(renderResult, true);
      expect(renderResult.result.current.formData.selectedProfile).toBe(regularProfile);

      const draResources = getContainerResourcesFromHardwareProfile(draProfileWithIdentifiers);
      act(() => {
        renderResult.result.current.setFormData('selectedProfile', draProfileWithIdentifiers);
        renderResult.result.current.setFormData('resources', draResources);
      });

      rerenderNewWorkload(renderResult, 'pending');
      expect(renderResult.result.current.excludeDRAProfiles).toBe(false);
      rerenderNewWorkload(renderResult, true);
      rerenderNewWorkload(renderResult, 'pending');
      rerenderNewWorkload(renderResult, true);

      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: draProfileWithIdentifiers,
        useExistingSettings: false,
        resources: draResources,
      });
    });

    it('should clear a newly selected DRA profile when DRA support changes to not supported', () => {
      const renderResult = renderNewWorkload(true);
      act(() => {
        renderResult.result.current.setFormData('selectedProfile', draProfileWithIdentifiers);
        renderResult.result.current.setFormData(
          'resources',
          getContainerResourcesFromHardwareProfile(draProfileWithIdentifiers),
        );
      });

      rerenderNewWorkload(renderResult, false);

      expect(renderResult.result.current.excludeDRAProfiles).toBe(true);
      expect(renderResult.result.current.formData).toEqual({
        selectedProfile: regularProfile,
        useExistingSettings: false,
        resources: getContainerResourcesFromHardwareProfile(regularProfile),
      });
    });
  });

  describe('claim template check', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    const regularProfile = mockHardwareProfile({ name: 'regular-profile' });
    const missingText =
      'The claim template single-gpu does not exist in this project. Ask your administrator to create it, or select a different hardware profile.';

    const renderWorkload = (
      existingHardwareProfileName?: string,
      options: { allowDRAProfiles?: boolean; project?: string } = {
        allowDRAProfiles: true,
        project: 'test-project',
      },
    ) =>
      testHook(useHardwareProfileConfig)(
        existingHardwareProfileName,
        existingHardwareProfileName ? { requests: {}, limits: {} } : undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        existingHardwareProfileName ? draProfile.metadata.namespace : undefined,
        options,
      );

    const pickDRAProfile = (renderResult: ReturnType<typeof renderWorkload>) =>
      act(() => {
        renderResult.result.current.setFormData('selectedProfile', draProfile);
        renderResult.result.current.setFormData('resources', { requests: {}, limits: {} });
      });

    beforeEach(() => {
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[regularProfile, draProfile], true, undefined],
      });
    });

    it('should be invalid when a newly selected DRA profile has a claim template missing from the project', () => {
      mockUseResourceClaimTemplateNames.mockReturnValue({
        status: 'ready',
        names: new Set(['other-template']),
      });
      const renderResult = renderWorkload();
      expect(renderResult.result.current.isFormDataValid).toBe(true);

      pickDRAProfile(renderResult);

      expect(mockUseResourceClaimTemplateNames).toHaveBeenLastCalledWith('test-project');
      expect(renderResult.result.current.claimTemplateMissingText).toBe(missingText);
      expect(renderResult.result.current.isFormDataValid).toBe(false);

      act(() => {
        renderResult.result.current.setFormData('selectedProfile', regularProfile);
        renderResult.result.current.setFormData(
          'resources',
          getContainerResourcesFromHardwareProfile(regularProfile),
        );
      });

      expect(renderResult.result.current.claimTemplateMissingText).toBeUndefined();
      expect(renderResult.result.current.isFormDataValid).toBe(true);
    });

    it('should be valid when the claim template of a newly selected DRA profile exists in the project', () => {
      mockUseResourceClaimTemplateNames.mockReturnValue({
        status: 'ready',
        names: new Set(['single-gpu']),
      });
      const renderResult = renderWorkload();

      pickDRAProfile(renderResult);

      expect(renderResult.result.current.claimTemplateMissingText).toBeUndefined();
      expect(renderResult.result.current.isFormDataValid).toBe(true);
    });

    it.each([
      ['loading', { status: 'loading' as const }],
      ['unavailable', { status: 'unavailable' as const }],
    ])('should be valid while the claim template list is %s', (_, claimTemplateNames) => {
      mockUseResourceClaimTemplateNames.mockReturnValue(claimTemplateNames);
      const renderResult = renderWorkload();

      pickDRAProfile(renderResult);

      expect(renderResult.result.current.claimTemplateMissingText).toBeUndefined();
      expect(renderResult.result.current.isFormDataValid).toBe(true);
    });

    describe('project-scoped DRA profile outside the hook profile list', () => {
      const projectDRAProfile = mockHardwareProfile({
        name: 'project-dra-profile',
        namespace: 'test-project',
        identifiers: [],
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });

      const pickProjectDRAProfile = (renderResult: ReturnType<typeof renderWorkload>) =>
        act(() => {
          renderResult.result.current.setFormData('selectedProfile', projectDRAProfile);
          renderResult.result.current.setFormData('resources', { requests: {}, limits: {} });
        });

      beforeEach(() => {
        mockUseHardwareProfiles.mockReturnValue({
          projectProfiles: [[], true, undefined],
          globalProfiles: [[regularProfile], true, undefined],
        });
      });

      it('should be invalid when its claim template is missing from the project', () => {
        mockUseResourceClaimTemplateNames.mockReturnValue({
          status: 'ready',
          names: new Set(['other-template']),
        });
        const renderResult = renderWorkload();
        expect(mockUseResourceClaimTemplateNames).toHaveBeenLastCalledWith(undefined);

        pickProjectDRAProfile(renderResult);

        expect(mockUseHardwareProfiles).toHaveBeenLastCalledWith(undefined, undefined, {
          dra: 'all',
        });
        expect(mockUseResourceClaimTemplateNames).toHaveBeenLastCalledWith('test-project');
        expect(renderResult.result.current.claimTemplateMissingText).toBe(missingText);
        expect(renderResult.result.current.isFormDataValid).toBe(false);
      });

      it('should be valid when its claim template exists in the project', () => {
        mockUseResourceClaimTemplateNames.mockReturnValue({
          status: 'ready',
          names: new Set(['single-gpu']),
        });
        const renderResult = renderWorkload();

        pickProjectDRAProfile(renderResult);

        expect(mockUseResourceClaimTemplateNames).toHaveBeenLastCalledWith('test-project');
        expect(renderResult.result.current.claimTemplateMissingText).toBeUndefined();
        expect(renderResult.result.current.isFormDataValid).toBe(true);
      });
    });

    it('should be valid for the DRA profile the workload is already bound to', () => {
      mockUseResourceClaimTemplateNames.mockReturnValue({ status: 'ready', names: new Set() });
      const renderResult = renderWorkload('dra-profile');

      expect(renderResult.result.current.formData.selectedProfile).toBe(draProfile);
      expect(renderResult.result.current.claimTemplateMissingText).toBeUndefined();
      expect(renderResult.result.current.isFormDataValid).toBe(true);
    });

    it.each([
      ['DRA profiles are excluded', { allowDRAProfiles: false, project: 'test-project' }],
      ['no project is given', { allowDRAProfiles: true }],
    ])('should not look up claim templates when %s', (_, options) => {
      mockUseResourceClaimTemplateNames.mockReturnValue({ status: 'ready', names: new Set() });
      const renderResult = renderWorkload(undefined, options);

      pickDRAProfile(renderResult);

      expect(mockUseResourceClaimTemplateNames).toHaveBeenLastCalledWith(undefined);
      expect(renderResult.result.current.claimTemplateNames).toBeUndefined();
      expect(renderResult.result.current.claimTemplateMissingText).toBeUndefined();
    });
  });

  describe('existingBinding', () => {
    it('should resolve a binding without a namespace to the workload namespace', () => {
      const renderResult = testHook(useHardwareProfileConfig)(
        'dra-profile',
        undefined,
        undefined,
        undefined,
        undefined,
        'test-project',
      );

      expect(renderResult.result.current.existingBinding).toEqual({
        name: 'dra-profile',
        namespace: 'test-project',
      });
    });

    it('should select the DRA hardware profile in the workload namespace for a workload bound by name only', () => {
      const projectDRAProfile = mockHardwareProfile({
        name: 'dra-profile',
        namespace: 'test-project',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      const dashboardDRAProfile = mockHardwareProfile({
        name: 'dra-profile',
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[projectDRAProfile], true, undefined],
        globalProfiles: [[dashboardDRAProfile], true, undefined],
      });
      const resources = {
        requests: { cpu: '1', memory: '2Gi' },
        limits: { cpu: '1', memory: '2Gi' },
        claims: [{ name: 'hwp-dra' }],
      };

      const renderResult = testHook(useHardwareProfileConfig)(
        'dra-profile',
        resources,
        undefined,
        undefined,
        undefined,
        'test-project',
        undefined,
        { allowDRAProfiles: true, project: 'test-project' },
      );
      const state = renderResult.result.current;

      expect(state.formData).toEqual({
        selectedProfile: projectDRAProfile,
        useExistingSettings: false,
        resources,
      });
      expect(state.initialHardwareProfile).toBe(projectDRAProfile);
      expect(state.existingBinding).toEqual({ name: 'dra-profile', namespace: 'test-project' });
      expect(state.isFormDataValid).toBe(true);
    });

    it('should select the hardware profile in the dashboard namespace for a workload bound by name only when the workload namespace has none', () => {
      const dashboardProfile = mockHardwareProfile({ name: 'legacy-profile' });
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[dashboardProfile], true, undefined],
      });
      const resources = {
        requests: { cpu: '1', memory: '2Gi' },
        limits: { cpu: '1', memory: '2Gi' },
      };

      const state = testHook(useHardwareProfileConfig)(
        'legacy-profile',
        resources,
        undefined,
        undefined,
        undefined,
        'test-project',
      ).result.current;

      expect(state.formData.selectedProfile).toBe(dashboardProfile);
      expect(state.formData.useExistingSettings).toBe(false);
      expect(state.initialHardwareProfile).toBe(dashboardProfile);
      expect(state.existingBinding).toEqual({ name: 'legacy-profile', namespace: 'test-project' });
    });

    it('should match the resources to a hardware profile for a workload bound by name only to a profile in neither namespace', () => {
      const matchingProfile = mockHardwareProfile({
        name: 'matching-profile',
        identifiers: [
          {
            identifier: 'cpu',
            minCount: '1',
            maxCount: '4',
            displayName: 'CPU',
            defaultCount: '1',
          },
        ],
        tolerations: [],
      });
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[matchingProfile], true, undefined],
      });
      const resources = { requests: { cpu: '2' }, limits: { cpu: '2' } };

      const state = testHook(useHardwareProfileConfig)(
        'missing-profile',
        resources,
        undefined,
        undefined,
        undefined,
        'test-project',
      ).result.current;

      expect(state.formData.selectedProfile).toBe(matchingProfile);
      expect(state.formData.useExistingSettings).toBe(false);
      expect(state.existingBinding).toEqual({ name: 'missing-profile', namespace: 'test-project' });
    });

    it('should keep the namespace of a binding that has one', () => {
      const renderResult = testHook(useHardwareProfileConfig)(
        'project-profile',
        undefined,
        undefined,
        undefined,
        undefined,
        'test-project',
        'test-project',
      );

      expect(renderResult.result.current.existingBinding).toEqual({
        name: 'project-profile',
        namespace: 'test-project',
      });
    });
  });

  it('should keep the existing resources of a workload whose assigned DRA hardware profile is locked', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[draProfile], true, undefined],
    });
    const resources = {
      requests: { cpu: '8', memory: '16Gi', 'nvidia.com/gpu': '1' },
      limits: { cpu: '8', memory: '16Gi', 'nvidia.com/gpu': '1' },
    };

    const state = testHook(useHardwareProfileConfig)(
      'dra-profile',
      resources,
      undefined,
      undefined,
      undefined,
      undefined,
      draProfile.metadata.namespace,
      { allowDRAProfiles: false },
    ).result.current;

    expect(state.formData).toEqual({
      selectedProfile: draProfile,
      useExistingSettings: true,
      resources,
    });
  });

  it('should merge the identifiers of an assigned DRA hardware profile into the existing resources and keep the claims', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '1',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '2',
        },
      ],
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[draProfile], true, undefined],
    });

    const renderResult = testHook(useHardwareProfileConfig)(
      'dra-profile',
      {
        requests: { cpu: '3', 'nvidia.com/gpu': '1' },
        limits: { cpu: '3', 'nvidia.com/gpu': '1' },
        claims: [{ name: 'hwp-dra' }],
      },
      undefined,
      undefined,
      undefined,
      undefined,
      draProfile.metadata.namespace,
      { allowDRAProfiles: true },
    );
    const state = renderResult.result.current;

    const expectedResources = {
      requests: { cpu: '3' },
      limits: { cpu: '3' },
      claims: [{ name: 'hwp-dra' }],
    };
    expect(state.formData).toEqual({
      selectedProfile: draProfile,
      useExistingSettings: false,
      resources: expectedResources,
    });
    expect(state.initialResources).toEqual(expectedResources);
  });

  it.each([
    ['no resources', undefined, { requests: {}, limits: {} }],
    [
      'only claims',
      { claims: [{ name: 'hwp-dra' }] },
      { requests: {}, limits: {}, claims: [{ name: 'hwp-dra' }] },
    ],
  ])(
    'should not fill in the identifiers of an assigned DRA hardware profile for a workload with %s',
    (_, resources, expectedResources) => {
      const draProfile = mockHardwareProfile({
        name: 'dra-profile',
        identifiers: [
          {
            identifier: 'cpu',
            minCount: '1',
            maxCount: '4',
            displayName: 'CPU',
            defaultCount: '2',
          },
        ],
        dra: { resourceClaimTemplateName: 'single-gpu' },
      });
      mockUseHardwareProfiles.mockReturnValue({
        projectProfiles: [[], true, undefined],
        globalProfiles: [[draProfile], true, undefined],
      });

      const renderResult = testHook(useHardwareProfileConfig)(
        'dra-profile',
        resources,
        undefined,
        undefined,
        undefined,
        undefined,
        draProfile.metadata.namespace,
        { allowDRAProfiles: true },
      );
      const state = renderResult.result.current;

      expect(state.formData).toEqual({
        selectedProfile: draProfile,
        useExistingSettings: false,
        resources: expectedResources,
      });
      expect(state.initialResources).toEqual(expectedResources);
      expect(state.isFormDataValid).toBe(true);
    },
  );

  it('should keep the claims of a workload assigned a regular hardware profile', () => {
    const regularProfile = mockHardwareProfile({
      name: 'regular-profile',
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '1',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '2',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[regularProfile], true, undefined],
    });

    const renderResult = testHook(useHardwareProfileConfig)(
      'regular-profile',
      { requests: { cpu: '3' }, limits: { cpu: '3' }, claims: [{ name: 'hwp-dra' }] },
      undefined,
      undefined,
      undefined,
      undefined,
      regularProfile.metadata.namespace,
    );

    expect(renderResult.result.current.formData.resources).toEqual({
      requests: { cpu: '3' },
      limits: { cpu: '3' },
      claims: [{ name: 'hwp-dra' }],
    });
  });

  it('should not match a workload that has resource claims to a hardware profile', () => {
    const regularProfile = mockHardwareProfile({
      name: 'regular-profile',
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '100m',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '1',
        },
        {
          identifier: 'memory',
          minCount: '100Mi',
          maxCount: '4Gi',
          displayName: 'Memory',
          defaultCount: '1Gi',
        },
      ],
      tolerations: [{ key: 'key1', value: 'value1' }],
      nodeSelector: { node: 'value1' },
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[regularProfile], true, undefined],
    });

    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '2', memory: '2Gi' },
    };
    const tolerations = [{ key: 'key1', value: 'value1' }];
    const nodeSelector = { node: 'value1' };

    const matched = testHook(useHardwareProfileConfig)(
      undefined,
      resources,
      tolerations,
      nodeSelector,
    );
    expect(matched.result.current.formData.selectedProfile).toBe(regularProfile);

    const withClaims = testHook(useHardwareProfileConfig)(
      undefined,
      { ...resources, claims: [{ name: 'gpu' }] },
      tolerations,
      nodeSelector,
    );
    expect(withClaims.result.current.formData.selectedProfile).toBeUndefined();
    expect(withClaims.result.current.formData.useExistingSettings).toBe(true);
    expect(withClaims.result.current.formData.resources).toEqual({
      ...resources,
      claims: [{ name: 'gpu' }],
    });
  });

  it('should not auto-select or match a DRA hardware profile', () => {
    const draProfile = mockHardwareProfile({
      name: 'dra-profile',
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '100m',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '1',
        },
        {
          identifier: 'memory',
          minCount: '100Mi',
          maxCount: '4Gi',
          displayName: 'Memory',
          defaultCount: '1Gi',
        },
      ],
      tolerations: [{ key: 'key1', value: 'value1' }],
      nodeSelector: { node: 'value1' },
      dra: { resourceClaimTemplateName: 'single-gpu' },
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[draProfile], true, undefined],
    });

    const newWorkload = testHook(useHardwareProfileConfig)();
    expect(newWorkload.result.current.formData.selectedProfile).toBeUndefined();

    const unassignedWorkload = testHook(useHardwareProfileConfig)(
      undefined,
      {
        requests: { cpu: '1', memory: '1Gi' },
        limits: { cpu: '2', memory: '2Gi' },
      },
      [{ key: 'key1', value: 'value1' }],
      { node: 'value1' },
    );
    expect(unassignedWorkload.result.current.formData.selectedProfile).toBeUndefined();
    expect(unassignedWorkload.result.current.formData.useExistingSettings).toBe(true);
  });

  it('should handle hardware profiles not being available', () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });

    const renderResult = testHook(useHardwareProfileConfig)();
    const state = renderResult.result.current;

    expect(state.isFormDataValid).toBe(false);
  });

  it('should handle form data updates', () => {
    const renderResult = testHook(useHardwareProfileConfig)();
    const hardwareProfile = mockHardwareProfile({
      name: 'test-profile',
    });

    let state = renderResult.result.current;
    expect(state.formData.selectedProfile).toBeUndefined();

    act(() => {
      state.setFormData('selectedProfile', hardwareProfile);
    });

    state = renderResult.result.current;
    expect(state.formData.selectedProfile).toBe(hardwareProfile);
  });

  it('should reset form data', () => {
    const renderResult = testHook(useHardwareProfileConfig)();

    let state = renderResult.result.current;
    act(() => {
      state.setFormData('useExistingSettings', true);
    });

    state = renderResult.result.current;
    expect(state.formData.useExistingSettings).toBe(true);

    act(() => {
      state.resetFormData();
    });

    state = renderResult.result.current;
    expect(state.formData).toEqual({
      selectedProfile: undefined,
      useExistingSettings: false,
    });
  });

  it('should merge new identifiers from updated hardware profile with existing resources', () => {
    const hardwareProfile = mockHardwareProfile({
      name: 'updated-profile',
      identifiers: [
        {
          identifier: 'cpu',
          minCount: '1',
          maxCount: '4',
          displayName: 'CPU',
          defaultCount: '2',
        },
        {
          identifier: 'memory',
          minCount: '1Gi',
          maxCount: '8Gi',
          displayName: 'Memory',
          defaultCount: '4Gi',
        },
        {
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 2,
          displayName: 'GPU',
          defaultCount: 1,
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[hardwareProfile], true, undefined],
    });
    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'updated-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      hardwareProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(hardwareProfile);
    expect(state.initialHardwareProfile).toBe(hardwareProfile);
    expect(state.formData.useExistingSettings).toBe(false);

    // Resources should be merged: existing CPU/Memory preserved, new GPU added with default value
    expect(state.formData.resources).toEqual({
      requests: {
        cpu: '2',
        memory: '4Gi',
        'nvidia.com/gpu': 1,
      },
      limits: {
        cpu: '2',
        memory: '4Gi',
        'nvidia.com/gpu': 1,
      },
    });
  });

  it('should clear notebook resources when hardware profile has all identifiers removed', () => {
    const emptyProfile = mockHardwareProfile({
      name: 'empty-profile',
      identifiers: [],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[emptyProfile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'empty-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      emptyProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(emptyProfile);
    expect(state.initialHardwareProfile).toBe(emptyProfile);
    expect(state.formData.useExistingSettings).toBe(false);

    // Resources should be cleared since profile has no identifiers
    expect(state.formData.resources).toEqual({
      requests: {},
      limits: {},
    });
  });

  it('should not change existing resources when hardware profile matches container resources', () => {
    const profile = mockHardwareProfile({
      name: 'standard-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'standard-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.selectedProfile).toBe(profile);
    expect(state.formData.resources).toEqual({
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    });
  });

  it('should add new GPU identifier when admin adds it to hardware profile', () => {
    // Admin adds GPU to profile after workload creation
    const profileWithGPU = mockHardwareProfile({
      name: 'profile-with-gpu',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
        {
          displayName: 'GPU',
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 4,
          defaultCount: 1,
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileWithGPU], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'profile-with-gpu',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileWithGPU.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.resources).toEqual({
      requests: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
      limits: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
    });
  });

  it('should remove orphaned identifiers when admin removes them from hardware profile', () => {
    // Admin removes memory and GPU, only CPU remains
    const profileCpuOnly = mockHardwareProfile({
      name: 'cpu-only-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileCpuOnly], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
      limits: { cpu: '2', memory: '4Gi', 'nvidia.com/gpu': 1 },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'cpu-only-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileCpuOnly.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Only CPU should remain, orphans removed
    expect(state.formData.resources).toEqual({
      requests: { cpu: '2' },
      limits: { cpu: '2' },
    });
  });

  it('should clear all resources when admin removes all identifiers from hardware profile', () => {
    const emptyProfile = mockHardwareProfile({
      name: 'empty-profile',
      identifiers: [],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[emptyProfile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '2', memory: '4Gi' },
      limits: { cpu: '2', memory: '4Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'empty-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      emptyProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.resources).toEqual({
      requests: {},
      limits: {},
    });
  });

  it('should preserve customized resources when hardware profile has not changed', () => {
    // User customized CPU to 4 and memory to 8Gi (defaults were 2, 4Gi)
    const profile = mockHardwareProfile({
      name: 'standard-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized values
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'standard-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profile.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Customized values should be preserved
    expect(state.formData.resources).toEqual({
      requests: { cpu: '4', memory: '8Gi' },
      limits: { cpu: '4', memory: '8Gi' },
    });
  });

  it('should preserve customized resources and add new GPU when admin adds identifier', () => {
    // User had customized CPU and memory, admin adds GPU
    const profileWithGPU = mockHardwareProfile({
      name: 'profile-with-gpu',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '2Gi',
          maxCount: '16Gi',
          defaultCount: '4Gi',
        },
        {
          displayName: 'GPU',
          identifier: 'nvidia.com/gpu',
          minCount: 1,
          maxCount: 4,
          defaultCount: 1,
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileWithGPU], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized values
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'profile-with-gpu',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileWithGPU.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Customizations preserved, GPU added with default
    expect(state.formData.resources).toEqual({
      requests: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 1 },
      limits: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 1 },
    });
  });

  it('should preserve only customized CPU when admin removes other identifiers', () => {
    // User had customized all three, admin removes memory and GPU
    const profileCpuOnlyCustomized = mockHardwareProfile({
      name: 'cpu-only-profile-customized',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '8',
          defaultCount: '2',
        },
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileCpuOnlyCustomized], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 2 }, // All customized
      limits: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': 2 },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'cpu-only-profile-customized',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileCpuOnlyCustomized.metadata.namespace,
    );
    const state = renderResult.result.current;

    // Only customized CPU preserved, orphans removed
    expect(state.formData.resources).toEqual({
      requests: { cpu: '4' },
      limits: { cpu: '4' },
    });
  });

  it('should clear all customized resources when admin removes all identifiers', () => {
    // User had customizations, admin removes all identifiers
    const emptyProfile = mockHardwareProfile({
      name: 'empty-profile',
      identifiers: [],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[emptyProfile], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'empty-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      emptyProfile.metadata.namespace,
    );
    const state = renderResult.result.current;

    // All resources cleared, customizations lost
    expect(state.formData.resources).toEqual({
      requests: {},
      limits: {},
    });
  });

  it('should preserve customized resources when admin changes min/max/default constraints', () => {
    // User customized to cpu: 4, admin changes constraints (user value still valid)
    const profileWithNewConstraints = mockHardwareProfile({
      name: 'updated-constraints-profile',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '2',
          maxCount: '6',
          defaultCount: '3',
        }, // Changed from 1-8, default 2
        {
          displayName: 'Memory',
          identifier: 'memory',
          minCount: '4Gi',
          maxCount: '12Gi',
          defaultCount: '6Gi',
        }, // Changed from 2-16, default 4
      ],
    });
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[profileWithNewConstraints], true, undefined],
    });

    const existingResources = {
      requests: { cpu: '4', memory: '8Gi' }, // User customized (still within new ranges)
      limits: { cpu: '4', memory: '8Gi' },
    };

    const renderResult = testHook(useHardwareProfileConfig)(
      'updated-constraints-profile',
      existingResources,
      undefined,
      undefined,
      undefined,
      undefined,
      profileWithNewConstraints.metadata.namespace,
    );
    const state = renderResult.result.current;

    expect(state.formData.resources).toEqual({
      requests: { cpu: '4', memory: '8Gi' },
      limits: { cpu: '4', memory: '8Gi' },
    });
  });
});

// ---------------------------------------------------------------------------
// Kueue auto-selection guard
// Tests the new-form guard that delays auto-selection until localQueues have
// loaded, preventing the selection of a profile whose localQueue may not exist
// in the current project's namespace.
// ---------------------------------------------------------------------------

const makeKueueProjectWrapper = (localQueues: LocalQueuesContextType['localQueues']) => {
  const kueueProject = mockProjectK8sResource({ enableKueue: true });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      CurrentProjectContext.Provider,
      { value: { currentProject: kueueProject } },
      React.createElement(LocalQueuesContext.Provider, { value: { localQueues } }, children),
    );
  Wrapper.displayName = 'KueueProjectWrapper';
  return Wrapper;
};

describe('useHardwareProfileConfig — Kueue auto-selection guard', () => {
  const kueueProfile = mockHardwareProfile({
    name: 'kueue-profile',
    schedulingType: SchedulingType.QUEUE,
    localQueueName: 'queue-a',
  });

  beforeEach(() => {
    mockUseHardwareProfiles.mockReturnValue({
      projectProfiles: [[], true, undefined],
      globalProfiles: [[kueueProfile], true, undefined],
    });
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });
  });

  it('defers auto-selection while localQueues are still loading', () => {
    const { result } = renderHook(() => useHardwareProfileConfig(), {
      wrapper: makeKueueProjectWrapper({
        data: [],
        loaded: false,
        error: undefined,
        refresh: jest.fn(),
      }),
    });

    // Guard fires: ONLY_KUEUE_PROFILES && localQueues not loaded → return early
    expect(result.current.formData.selectedProfile).toBeUndefined();
  });

  it('auto-selects first matching Kueue profile once localQueues have loaded', () => {
    const { result } = renderHook(() => useHardwareProfileConfig(), {
      wrapper: makeKueueProjectWrapper({
        data: [mockLocalQueueK8sResource({ name: 'queue-a' })],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      }),
    });

    // localQueues loaded with queue-a → profile whose localQueueName matches → selected
    expect(result.current.formData.selectedProfile).toBe(kueueProfile);
  });

  it('auto-selects immediately when localQueues fetch fails (fail-open)', () => {
    const { result } = renderHook(() => useHardwareProfileConfig(), {
      wrapper: makeKueueProjectWrapper({
        data: [],
        loaded: true,
        error: new Error('fetch failed'),
        refresh: jest.fn(),
      }),
    });

    // error state → fail-open: no queue filtering → kueueProfile is selected
    expect(result.current.formData.selectedProfile).toBe(kueueProfile);
  });

  it('does not auto-select a Kueue profile whose queue is missing once localQueues are ready', () => {
    const { result } = renderHook(() => useHardwareProfileConfig(), {
      wrapper: makeKueueProjectWrapper({
        data: [mockLocalQueueK8sResource({ name: 'some-other-queue' })],
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      }),
    });

    // queue-a (kueueProfile's localQueueName) is not in the available queues → filtered out
    expect(result.current.formData.selectedProfile).toBeUndefined();
  });
});
