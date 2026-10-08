import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdvancedSettingsStepContent } from '../AdvancedOptionsStep';
import type { ExternalDataMap } from '../../ExternalDataLoader';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';
import type { WizardField } from '../../../../shared/types/form-data';

const externalData: ExternalDataMap = {};

const userExtensionField = (): WizardField => ({
  id: 'unit-test-user-extension',
  type: 'addition',
  parentId: 'model-users',
  isActive: () => true,
  reducerFunctions: {
    setFieldData: (v) => v,
    getInitialFieldData: () => undefined,
  },
  component: () => null,
});

describe('AdvancedSettingsStepContent', () => {
  describe('users and availability section visibility', () => {
    const modelAvailabilityBase = {
      showField: true,
      data: { saveAsAiAsset: false, useCase: '' },
      setData: jest.fn(),
    };

    it('should hide Users and Availability when MaaS and Gen AI Studio are unavailable', () => {
      const wizardState = mockDeploymentWizardState({
        fields: [],
        advancedOptions: { isExternalRouteVisible: false },
        state: {
          modelAvailability: {
            ...modelAvailabilityBase,
            isGenAiEnabled: false,
          },
        },
      });

      render(
        <AdvancedSettingsStepContent
          wizardState={wizardState}
          externalData={externalData}
          allowCreate
        />,
      );

      expect(screen.queryByTestId('model-users')).not.toBeInTheDocument();
      expect(screen.queryByTestId('model-availability')).not.toBeInTheDocument();
    });

    it('should show Availability when Gen AI Studio is enabled', () => {
      const wizardState = mockDeploymentWizardState({
        fields: [],
        advancedOptions: { isExternalRouteVisible: false },
        state: {
          modelAvailability: {
            ...modelAvailabilityBase,
            isGenAiEnabled: true,
          },
        },
      });

      render(
        <AdvancedSettingsStepContent
          wizardState={wizardState}
          externalData={externalData}
          allowCreate
        />,
      );

      expect(screen.queryByTestId('model-users')).not.toBeInTheDocument();
      expect(screen.getByTestId('model-availability')).toBeInTheDocument();
    });

    it('should show Users and MaaS guidance even if Gen AI Studio is disabled', () => {
      const wizardState = mockDeploymentWizardState({
        fields: [userExtensionField()],
        advancedOptions: { isExternalRouteVisible: false },
        state: {
          modelAvailability: {
            ...modelAvailabilityBase,
            isGenAiEnabled: false,
            isMaaSSubscriptionSelected: true,
          },
        },
      });

      render(
        <AdvancedSettingsStepContent
          wizardState={wizardState}
          externalData={externalData}
          allowCreate
        />,
      );

      expect(screen.getByTestId('model-users')).toBeInTheDocument();
      expect(screen.getByTestId('maas-additional-configuration-alert')).toBeInTheDocument();
      expect(screen.queryByTestId('model-availability')).not.toBeInTheDocument();
    });

    it('should show the MaaS configuration alert and hide Use case for subscribed users', () => {
      const wizardState = mockDeploymentWizardState({
        fields: [userExtensionField()],
        advancedOptions: { isExternalRouteVisible: false },
        state: {
          modelAvailability: {
            ...modelAvailabilityBase,
            data: { saveAsAiAsset: true, useCase: 'chat' },
            isGenAiEnabled: true,
            isMaaSSubscriptionSelected: true,
          },
        },
      });

      render(
        <AdvancedSettingsStepContent
          wizardState={wizardState}
          externalData={externalData}
          allowCreate
        />,
      );

      expect(screen.getByTestId('maas-additional-configuration-alert')).toBeInTheDocument();
      expect(screen.queryByTestId('use-case-input')).not.toBeInTheDocument();
      expect(screen.getByTestId('model-availability')).toContainElement(
        screen.getByTestId('maas-additional-configuration-alert'),
      );
    });
  });
});
