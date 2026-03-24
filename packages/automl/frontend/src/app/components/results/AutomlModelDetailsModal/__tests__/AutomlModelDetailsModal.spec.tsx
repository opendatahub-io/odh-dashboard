/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutomlModelDetailsModal from '~/app/components/results/AutomlModelDetailsModal/AutomlModelDetailsModal';

// PF Modal renders into a portal; queries against the whole document work by default.

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  modelName: 'CatBoost_BAG_L2_FULL',
  rank: 1,
  taskType: 'multiclass' as const,
};

describe('AutomlModelDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when isOpen is true', () => {
    render(<AutomlModelDetailsModal {...defaultProps} />);
    expect(screen.getByTestId('automl-model-details-modal')).toBeInTheDocument();
  });

  it('should not render content when model is not found', () => {
    const { container } = render(
      <AutomlModelDetailsModal {...defaultProps} modelName="NonExistentModel" />,
    );
    // Modal renders but body is empty since model guard returns null
    expect(container.querySelector('.automl-model-details-header')).not.toBeInTheDocument();
  });

  it('should render sidebar navigation with correct sections', () => {
    render(<AutomlModelDetailsModal {...defaultProps} />);

    // Model viewer section tabs
    expect(screen.getByTestId('tab-model-information')).toBeInTheDocument();
    expect(screen.getByTestId('tab-feature-summary')).toBeInTheDocument();

    // Evaluation section tabs
    expect(screen.getByTestId('tab-model-evaluation')).toBeInTheDocument();
    expect(screen.getByTestId('tab-confusion-matrix')).toBeInTheDocument();
  });

  it('should show model information tab by default', () => {
    render(<AutomlModelDetailsModal {...defaultProps} />);

    // The first tab (model-information) should be active
    const navButton = screen.getByTestId('tab-model-information');
    expect(navButton.className).toContain('automl-model-details-nav-item--active');
  });

  it('should switch tabs when a sidebar nav item is clicked', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModal {...defaultProps} />);

    // Click on Feature Summary tab
    await user.click(screen.getByTestId('tab-feature-summary'));

    const featureTab = screen.getByTestId('tab-feature-summary');
    expect(featureTab.className).toContain('automl-model-details-nav-item--active');

    // Previous tab should no longer be active
    const modelInfoTab = screen.getByTestId('tab-model-information');
    expect(modelInfoTab.className).not.toContain('automl-model-details-nav-item--active');
  });

  it('should exclude confusion matrix tab for timeseries task type', () => {
    render(
      <AutomlModelDetailsModal
        {...defaultProps}
        taskType="timeseries"
        modelName="TemporalFusionTransformer"
      />,
    );

    expect(screen.getByTestId('tab-model-information')).toBeInTheDocument();
    expect(screen.getByTestId('tab-feature-summary')).toBeInTheDocument();
    expect(screen.getByTestId('tab-model-evaluation')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-confusion-matrix')).not.toBeInTheDocument();
  });

  it('should exclude confusion matrix tab for regression task type', () => {
    render(
      <AutomlModelDetailsModal
        {...defaultProps}
        taskType="regression"
        modelName="CatBoost_BAG_L2_FULL"
      />,
    );

    expect(screen.queryByTestId('tab-confusion-matrix')).not.toBeInTheDocument();
  });

  it('should render section headers in sidebar', () => {
    render(<AutomlModelDetailsModal {...defaultProps} />);

    expect(screen.getByText('Model viewer')).toBeInTheDocument();
    expect(screen.getByText('Evaluation')).toBeInTheDocument();
  });

  it('should display tooltip icon next to tab title', () => {
    render(<AutomlModelDetailsModal {...defaultProps} />);

    // Each active tab should have a tooltip button
    expect(screen.getByLabelText('Model information info')).toBeInTheDocument();
  });

  it('should render Download and Save as notebook buttons', () => {
    render(<AutomlModelDetailsModal {...defaultProps} />);

    expect(screen.getByTestId('model-details-download')).toBeInTheDocument();
    expect(screen.getByTestId('model-details-save-notebook')).toBeInTheDocument();
  });

  it('should call onClose when modal close is triggered', async () => {
    const onClose = jest.fn();
    render(<AutomlModelDetailsModal {...defaultProps} onClose={onClose} />);

    // PF Modal renders a close button
    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should switch model when a different model is selected via dropdown', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModal {...defaultProps} />);

    // Open the model selector dropdown
    const toggle = screen.getByTestId('model-selector-dropdown');
    await user.click(toggle);

    // Select a different model
    await user.click(screen.getByText('RandomForest_BAG_L1_FULL'));

    // The dropdown should now show the new model name
    expect(screen.getByTestId('model-selector-dropdown')).toHaveTextContent(
      'RandomForest_BAG_L1_FULL',
    );
  });

  it('should enable download button when feature importance data is loaded', () => {
    render(
      <AutomlModelDetailsModal
        {...defaultProps}
        taskType="regression"
        modelName="CatBoost_BAG_L2_FULL"
      />,
    );

    const downloadButton = screen.getByTestId('model-details-download');
    expect(downloadButton).toBeEnabled();
  });
});
