import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  describe('external route access', () => {
    it.each([false, true])(
      'should let contributors toggle external access without changing token authentication (enabled: %s)',
      (hasTokenAuth) => {
        const tokens = hasTokenAuth
          ? [{ uuid: 'existing-token', displayName: 'existing-service-account' }]
          : [];
        const wizardState = mockDeploymentWizardState({
          state: {
            canCreateRoleBindings: false,
            externalRoute: { data: false },
            tokenAuthentication: { data: tokens },
          },
        });
        const { rerender } = render(
          <AdvancedSettingsStepContent
            wizardState={wizardState}
            externalData={externalData}
            allowCreate={false}
          />,
        );

        expect(screen.getByTestId('model-access-checkbox')).toBeEnabled();
        expect(screen.getByTestId('token-authentication-checkbox')).toBeDisabled();
        expect(screen.getByTestId('token-authentication-checkbox')).toHaveProperty(
          'checked',
          hasTokenAuth,
        );
        fireEvent.click(screen.getByTestId('model-access-checkbox'));
        expect(wizardState.state.externalRoute.setData).toHaveBeenLastCalledWith(true);
        expect(wizardState.state.tokenAuthentication.setData).not.toHaveBeenCalled();

        wizardState.state.externalRoute.data = true;
        rerender(
          <AdvancedSettingsStepContent
            wizardState={wizardState}
            externalData={externalData}
            allowCreate={false}
          />,
        );
        fireEvent.click(screen.getByTestId('model-access-checkbox'));
        expect(wizardState.state.externalRoute.setData).toHaveBeenLastCalledWith(false);
        expect(wizardState.state.tokenAuthentication.setData).not.toHaveBeenCalled();
      },
    );

    it('should still auto-enable token authentication for project admins enabling external access', () => {
      const wizardState = mockDeploymentWizardState({
        state: { externalRoute: { data: false }, tokenAuthentication: { data: [] } },
      });
      render(
        <AdvancedSettingsStepContent
          wizardState={wizardState}
          externalData={externalData}
          allowCreate
        />,
      );

      expect(screen.getByTestId('token-authentication-checkbox')).toBeEnabled();
      fireEvent.click(screen.getByTestId('model-access-checkbox'));
      expect(wizardState.state.externalRoute.setData).toHaveBeenCalledWith(true);
      expect(wizardState.state.tokenAuthentication.setData).toHaveBeenCalledWith([
        expect.objectContaining({ displayName: 'default-token', error: '' }),
      ]);
    });
  });

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
