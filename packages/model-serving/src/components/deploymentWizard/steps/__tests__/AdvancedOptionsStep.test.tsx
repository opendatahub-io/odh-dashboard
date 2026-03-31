import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdvancedSettingsStepContent } from '../AdvancedOptionsStep';
import type { ExternalDataMap } from '../../ExternalDataLoader';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';
import type { WizardField } from '../../types';

const externalData: ExternalDataMap = {};

const playgroundExtensionField = (): WizardField => ({
  id: 'unit-test-playground-extension',
  type: 'addition',
  parentId: 'model-playground-availability',
  isActive: () => true,
  reducerFunctions: {
    setFieldData: (v) => v,
    getInitialFieldData: () => undefined,
  },
  component: () => null,
});

describe('AdvancedSettingsStepContent', () => {
  describe('model playground availability section visibility', () => {
    const modelAvailabilityBase = {
      showField: true,
      data: { saveAsAiAsset: false, useCase: '' },
      setData: jest.fn(),
    };

    it('should hide the Model availability section when Gen AI is disabled and there are no extension fields', () => {
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

      expect(screen.queryByTestId('model-playground-availability')).not.toBeInTheDocument();
    });

    it('should show the Model availability section when Gen AI is enabled', () => {
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

      expect(screen.getByTestId('model-playground-availability')).toBeInTheDocument();
    });

    it('should show the Model availability section when extension fields target model-playground-availability even if Gen AI is disabled', () => {
      const wizardState = mockDeploymentWizardState({
        fields: [playgroundExtensionField()],
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

      expect(screen.getByTestId('model-playground-availability')).toBeInTheDocument();
    });
  });
});
