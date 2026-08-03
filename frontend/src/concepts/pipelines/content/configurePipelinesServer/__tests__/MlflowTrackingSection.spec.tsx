import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MlflowTrackingSection from '#~/concepts/pipelines/content/configurePipelinesServer/MlflowTrackingSection';
import { DSPAMlflowIntegrationMode, DSPipelineMlflowKind } from '#~/k8sTypes';

describe('MlflowTrackingSection', () => {
  describe('form variant', () => {
    it('should render integration checkbox unchecked when integrationMode is DISABLED', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.DISABLED,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mlflow-integration-mode-checkbox')).not.toBeChecked();
    });

    it('should render integration checkbox checked when integrationMode is AUTODETECT', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mlflow-integration-mode-checkbox')).toBeChecked();
    });

    it('should render integration checkbox checked when integrationMode is undefined', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: undefined,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mlflow-integration-mode-checkbox')).toBeChecked();
    });

    it('should call setMlflow with AUTODETECT when toggling integration on', () => {
      const setMlflow = jest.fn();
      const mlflow: DSPipelineMlflowKind = {
        integrationMode: DSPAMlflowIntegrationMode.DISABLED,
        injectUserEnvVars: false,
      };

      render(<MlflowTrackingSection mlflow={mlflow} setMlflow={setMlflow} />);

      fireEvent.click(screen.getByTestId('mlflow-integration-mode-checkbox'));

      expect(setMlflow).toHaveBeenCalledWith({
        integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
        injectUserEnvVars: false,
      });
    });

    it('should call setMlflow with DISABLED and force injectUserEnvVars to false when toggling integration off', () => {
      const setMlflow = jest.fn();
      const mlflow: DSPipelineMlflowKind = {
        integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
        injectUserEnvVars: true,
      };

      render(<MlflowTrackingSection mlflow={mlflow} setMlflow={setMlflow} />);

      fireEvent.click(screen.getByTestId('mlflow-integration-mode-checkbox'));

      expect(setMlflow).toHaveBeenCalledWith({
        integrationMode: DSPAMlflowIntegrationMode.DISABLED,
        injectUserEnvVars: false,
      });
    });

    it('should disable inject checkbox when integration is off', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.DISABLED,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mlflow-inject-env-vars-checkbox')).toBeDisabled();
    });

    it('should enable inject checkbox when integrationMode is AUTODETECT', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mlflow-inject-env-vars-checkbox')).toBeEnabled();
    });

    it('should enable inject checkbox when integrationMode is undefined', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: undefined,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mlflow-inject-env-vars-checkbox')).toBeEnabled();
    });

    it('should call setMlflow with injectUserEnvVars true when toggling inject on', () => {
      const setMlflow = jest.fn();
      const mlflow: DSPipelineMlflowKind = {
        integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
        injectUserEnvVars: false,
      };

      render(<MlflowTrackingSection mlflow={mlflow} setMlflow={setMlflow} />);

      fireEvent.click(screen.getByTestId('mlflow-inject-env-vars-checkbox'));

      expect(setMlflow).toHaveBeenCalledWith({
        integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
        injectUserEnvVars: true,
      });
    });

    it('should render inject checkbox unchecked when injectUserEnvVars is undefined', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
            injectUserEnvVars: undefined,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mlflow-inject-env-vars-checkbox')).not.toBeChecked();
    });

    it('should render section title', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByText('MLflow experiment tracking')).toBeInTheDocument();
    });
  });

  describe('description variant', () => {
    it('should render in description list layout with both checkboxes', () => {
      render(
        <MlflowTrackingSection
          variant="description"
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      expect(screen.getByText('MLflow experiment tracking')).toBeInTheDocument();
      expect(screen.getByTestId('mlflow-integration-mode-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('mlflow-inject-env-vars-checkbox')).toBeInTheDocument();
    });

    it('should call setMlflow when toggling integration checkbox', () => {
      const setMlflow = jest.fn();

      render(
        <MlflowTrackingSection
          variant="description"
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.DISABLED,
            injectUserEnvVars: false,
          }}
          setMlflow={setMlflow}
        />,
      );

      fireEvent.click(screen.getByTestId('mlflow-integration-mode-checkbox'));

      expect(setMlflow).toHaveBeenCalledWith({
        integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
        injectUserEnvVars: false,
      });
    });
  });

  describe('tooltip behavior', () => {
    it('should wrap inject checkbox in tooltip wrapper when integration is disabled', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.DISABLED,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      // PF Tooltip wraps the trigger element in a <div style="display: contents;">
      const injectCheckbox = screen.getByTestId('mlflow-inject-env-vars-checkbox');
      expect(injectCheckbox.closest('[style="display: contents;"]')).not.toBeNull();
    });

    it('should not wrap inject checkbox in tooltip wrapper when integration is enabled', () => {
      render(
        <MlflowTrackingSection
          mlflow={{
            integrationMode: DSPAMlflowIntegrationMode.AUTODETECT,
            injectUserEnvVars: false,
          }}
          setMlflow={jest.fn()}
        />,
      );

      const injectCheckbox = screen.getByTestId('mlflow-inject-env-vars-checkbox');
      expect(injectCheckbox.closest('[style="display: contents;"]')).toBeNull();
    });
  });
});
