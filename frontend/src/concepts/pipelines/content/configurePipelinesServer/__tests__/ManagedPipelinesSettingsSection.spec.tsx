import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManagedPipelinesSettingsSection from '#~/concepts/pipelines/content/configurePipelinesServer/ManagedPipelinesSettingsSection';
import { PipelineServerConfigType } from '#~/concepts/pipelines/content/configurePipelinesServer/types';
import { EMPTY_AWS_PIPELINE_DATA } from '#~/pages/projects/dataConnections/const';

const baseConfig: PipelineServerConfigType = {
  database: { useDefault: true, value: [] },
  objectStorage: { newValue: EMPTY_AWS_PIPELINE_DATA },
  storeYamlInKubernetes: true,
  enableCaching: true,
  enableManagedPipelines: false,
};

describe('ManagedPipelinesSettingsSection', () => {
  describe('form variant', () => {
    it('should render the checkbox unchecked by default', () => {
      render(<ManagedPipelinesSettingsSection config={baseConfig} setConfig={jest.fn()} />);

      const checkbox = screen.getByTestId('managed-pipelines-checkbox');
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toBeEnabled();
    });

    it('should render the checkbox checked when enableManagedPipelines is true', () => {
      render(
        <ManagedPipelinesSettingsSection
          config={{ ...baseConfig, enableManagedPipelines: true }}
          setConfig={jest.fn()}
        />,
      );

      expect(screen.getByTestId('managed-pipelines-checkbox')).toBeChecked();
    });

    it('should toggle enableManagedPipelines when clicked', () => {
      const setConfig = jest.fn();
      render(<ManagedPipelinesSettingsSection config={baseConfig} setConfig={setConfig} />);

      fireEvent.click(screen.getByTestId('managed-pipelines-checkbox'));

      expect(setConfig).toHaveBeenCalledWith({ ...baseConfig, enableManagedPipelines: true });
    });

    it('should render section title and description', () => {
      render(<ManagedPipelinesSettingsSection config={baseConfig} setConfig={jest.fn()} />);

      expect(screen.getByText('Managed pipelines')).toBeInTheDocument();
      expect(screen.getByText('Enable AutoML and AutoRAG pipelines')).toBeInTheDocument();
    });
  });

  describe('showWarning behavior', () => {
    it('should show warning alert when showWarning is true and checkbox is unchecked', () => {
      render(
        <ManagedPipelinesSettingsSection config={baseConfig} setConfig={jest.fn()} showWarning />,
      );

      expect(screen.getByTestId('managed-pipelines-required-helper-text')).toBeInTheDocument();
    });

    it('should not show warning alert when enableManagedPipelines is true', () => {
      render(
        <ManagedPipelinesSettingsSection
          config={{ ...baseConfig, enableManagedPipelines: true }}
          setConfig={jest.fn()}
          showWarning
        />,
      );

      expect(
        screen.queryByTestId('managed-pipelines-required-helper-text'),
      ).not.toBeInTheDocument();
    });

    it('should not show warning alert when showWarning is not set', () => {
      render(<ManagedPipelinesSettingsSection config={baseConfig} setConfig={jest.fn()} />);

      expect(
        screen.queryByTestId('managed-pipelines-required-helper-text'),
      ).not.toBeInTheDocument();
    });

    it('should show warning in description variant when unchecked with showWarning', () => {
      render(
        <ManagedPipelinesSettingsSection
          variant="description"
          enableManagedPipelines={false}
          setEnableManagedPipelines={jest.fn()}
          showWarning
        />,
      );

      expect(screen.getByTestId('managed-pipelines-required-helper-text')).toBeInTheDocument();
    });

    it('should not show warning in description variant when checked with showWarning', () => {
      render(
        <ManagedPipelinesSettingsSection
          variant="description"
          enableManagedPipelines
          setEnableManagedPipelines={jest.fn()}
          showWarning
        />,
      );

      expect(
        screen.queryByTestId('managed-pipelines-required-helper-text'),
      ).not.toBeInTheDocument();
    });
  });

  describe('description variant', () => {
    it('should render in a description list layout', () => {
      render(
        <ManagedPipelinesSettingsSection
          variant="description"
          enableManagedPipelines={false}
          setEnableManagedPipelines={jest.fn()}
        />,
      );

      expect(screen.getByText('Managed pipelines')).toBeInTheDocument();
      expect(screen.getByTestId('managed-pipelines-checkbox')).not.toBeChecked();
    });

    it('should toggle via setEnableManagedPipelines when clicked', () => {
      const setEnableManagedPipelines = jest.fn();
      render(
        <ManagedPipelinesSettingsSection
          variant="description"
          enableManagedPipelines={false}
          setEnableManagedPipelines={setEnableManagedPipelines}
        />,
      );

      fireEvent.click(screen.getByTestId('managed-pipelines-checkbox'));
      expect(setEnableManagedPipelines).toHaveBeenCalledWith(true);
    });
  });
});
