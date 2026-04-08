import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MlflowIntegrationSection from '#~/concepts/pipelines/content/createRun/contentSections/MlflowIntegrationSection';
import { getDefaultMlflowFormData } from '#~/concepts/pipelines/content/createRun/utils';
import { MlflowExperimentMode } from '#~/concepts/pipelines/content/createRun/types';

jest.mock('#~/concepts/mlflow/MlflowExperimentSelector', () => {
  const MockMlflowExperimentSelector = () => <div data-testid="mlflow-experiment-selector" />;
  MockMlflowExperimentSelector.displayName = 'MockMlflowExperimentSelector';
  return MockMlflowExperimentSelector;
});

jest.mock('#~/concepts/dashboard/DashboardHelpTooltip', () => {
  const MockDashboardHelpTooltip = () => <div data-testid="dashboard-help-tooltip" />;
  MockDashboardHelpTooltip.displayName = 'MockDashboardHelpTooltip';
  return MockDashboardHelpTooltip;
});

describe('MlflowIntegrationSection', () => {
  it('should render MLflow tracking as enabled by default', () => {
    render(
      <MlflowIntegrationSection
        data={getDefaultMlflowFormData()}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByLabelText('Enable MLflow experiment tracking')).toBeChecked();
  });

  it('should disable the experiment controls when tracking is unchecked', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.EXISTING,
          existingExperimentName: 'Existing experiment',
        }}
        onChange={onChange}
        workspace="test-workspace"
      />,
    );

    await user.click(screen.getByLabelText('Enable MLflow experiment tracking'));

    expect(onChange).toHaveBeenCalledWith({ isExperimentTrackingEnabled: false });
  });

  it('should disable controls and default to EXISTING mode when tracking is off', () => {
    render(
      <MlflowIntegrationSection
        data={{ isExperimentTrackingEnabled: false }}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByLabelText('Choose existing MLflow experiment')).toBeDisabled();
    expect(screen.getByLabelText('Create new MLflow experiment')).toBeDisabled();
    expect(screen.getByTestId('mlflow-experiment-selector')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-new-experiment-name')).not.toBeInTheDocument();
  });

  it('should preserve NEW mode when tracking is disabled from NEW mode', () => {
    const { rerender } = render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.NEW,
          newExperimentName: 'my-exp',
        }}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByTestId('mlflow-new-experiment-name')).toBeInTheDocument();

    rerender(
      <MlflowIntegrationSection
        data={{ isExperimentTrackingEnabled: false }}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByTestId('mlflow-new-experiment-name')).toBeInTheDocument();
    expect(screen.getByTestId('mlflow-new-experiment-name')).toBeDisabled();
    expect(screen.queryByTestId('mlflow-experiment-selector')).not.toBeInTheDocument();
  });

  it('should enable tracking with EXISTING mode when checkbox is checked from off', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <MlflowIntegrationSection
        data={{ isExperimentTrackingEnabled: false }}
        onChange={onChange}
        workspace="test-workspace"
      />,
    );

    await user.click(screen.getByLabelText('Enable MLflow experiment tracking'));

    expect(onChange).toHaveBeenCalledWith({
      isExperimentTrackingEnabled: true,
      mode: MlflowExperimentMode.EXISTING,
      existingExperimentName: '',
    });
  });

  it('should restore NEW mode when re-enabling tracking after disabling from NEW mode', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.NEW,
          newExperimentName: 'my-exp',
        }}
        onChange={onChange}
        workspace="test-workspace"
      />,
    );

    rerender(
      <MlflowIntegrationSection
        data={{ isExperimentTrackingEnabled: false }}
        onChange={onChange}
        workspace="test-workspace"
      />,
    );

    await user.click(screen.getByLabelText('Enable MLflow experiment tracking'));

    expect(onChange).toHaveBeenCalledWith({
      isExperimentTrackingEnabled: true,
      mode: MlflowExperimentMode.NEW,
      newExperimentName: 'my-exp',
    });
  });

  it('should show the experiment selector in EXISTING mode', () => {
    render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.EXISTING,
          existingExperimentName: '',
        }}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByTestId('mlflow-experiment-selector')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-new-experiment-name')).not.toBeInTheDocument();
  });

  it('should show the text input in NEW mode', () => {
    render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.NEW,
          newExperimentName: '',
        }}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByTestId('mlflow-new-experiment-name')).toBeInTheDocument();
    expect(screen.queryByTestId('mlflow-experiment-selector')).not.toBeInTheDocument();
  });

  it('should switch to NEW mode when the create new radio is clicked', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.EXISTING,
          existingExperimentName: '',
        }}
        onChange={onChange}
        workspace="test-workspace"
      />,
    );

    await user.click(screen.getByLabelText('Create new MLflow experiment'));

    expect(onChange).toHaveBeenCalledWith({
      isExperimentTrackingEnabled: true,
      mode: MlflowExperimentMode.NEW,
      newExperimentName: '',
    });
  });

  it('should switch to EXISTING mode when the choose existing radio is clicked', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.NEW,
          newExperimentName: 'some-name',
        }}
        onChange={onChange}
        workspace="test-workspace"
      />,
    );

    await user.click(screen.getByLabelText('Choose existing MLflow experiment'));

    expect(onChange).toHaveBeenCalledWith({
      isExperimentTrackingEnabled: true,
      mode: MlflowExperimentMode.EXISTING,
      existingExperimentName: '',
    });
  });

  it('should call onChange with typed value in new experiment name input', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <MlflowIntegrationSection
        data={{
          isExperimentTrackingEnabled: true,
          mode: MlflowExperimentMode.NEW,
          newExperimentName: '',
        }}
        onChange={onChange}
        workspace="test-workspace"
      />,
    );

    await user.type(screen.getByTestId('mlflow-new-experiment-name'), 'a');

    expect(onChange).toHaveBeenCalledWith({
      isExperimentTrackingEnabled: true,
      mode: MlflowExperimentMode.NEW,
      newExperimentName: 'a',
    });
  });

  it('should render the autologging code snippet', () => {
    render(
      <MlflowIntegrationSection
        data={getDefaultMlflowFormData()}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByText(/mlflow\.autolog\(\)/)).toBeInTheDocument();
  });

  it('should render the copy to clipboard button', () => {
    render(
      <MlflowIntegrationSection
        data={getDefaultMlflowFormData()}
        onChange={jest.fn()}
        workspace="test-workspace"
      />,
    );

    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
  });
});
