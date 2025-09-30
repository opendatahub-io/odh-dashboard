import React from 'react';
import { render, screen } from '@testing-library/react';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { AdvancedSettingsStepContent } from '../AdvancedOptionsStep';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';

describe('AdvancedOptionsStep', () => {
  describe('Component', () => {
    it('should not render the AI Asset section if the model type is not generative', () => {
      render(
        <AdvancedSettingsStepContent
          wizardState={mockDeploymentWizardState({
            state: {
              modelType: {
                data: ServingRuntimeModelType.PREDICTIVE,
              },
            },
          })}
          project={mockProjectK8sResource({})}
        />,
      );
      expect(screen.queryByTestId('ai-asset-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('save-as-ai-asset-checkbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('use-case-input')).not.toBeInTheDocument();
    });
    it('should render the AI Asset section if the model type is generative', () => {
      render(
        <AdvancedSettingsStepContent
          wizardState={mockDeploymentWizardState()}
          project={mockProjectK8sResource({})}
        />,
      );
      expect(screen.getByTestId('ai-asset-section')).toBeInTheDocument();
      expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeInTheDocument();
    });
  });
});
