/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutomlResultsContext } from '~/app/context/AutomlResultsContext';
import {
  mockTabularContext,
  mockTimeseriesContext,
  mockTabularFeatureImportances,
  mockTabularConfusionMatrices,
} from '~/app/mocks/mockAutomlResultsContext';
import AutomlModelDetailsModal from '~/app/components/run-results/AutomlModelDetailsModal/AutomlModelDetailsModal';

// Mock react-router
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

// Mock query hooks
jest.mock('~/app/hooks/queries', () => ({
  useModelEvaluationArtifactsQuery: jest.fn(),
}));

// PF Modal renders into a portal; queries against the whole document work by default.

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  modelName: 'CatBoost_BAG_L2_FULL',
  rank: 1,
};

describe('AutomlModelDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useParams to return a namespace
    const { useParams } = jest.requireMock('react-router');
    useParams.mockReturnValue({ namespace: 'test-namespace' });

    // Mock useModelEvaluationArtifactsQuery to return feature importance and confusion matrix
    const { useModelEvaluationArtifactsQuery } = jest.requireMock('~/app/hooks/queries');
    useModelEvaluationArtifactsQuery.mockReturnValue({
      featureImportance: mockTabularFeatureImportances.CatBoost_BAG_L2_FULL,
      confusionMatrix: mockTabularConfusionMatrices.CatBoost_BAG_L2_FULL,
      isLoading: false,
    });
  });

  it('should render the modal when isOpen is true', () => {
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );
    expect(screen.getByTestId('automl-model-details-modal')).toBeInTheDocument();
  });

  it('should not render content when model is not found', () => {
    const { container } = render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} modelName="NonExistentModel" />
      </AutomlResultsContext.Provider>,
    );
    // Modal renders but body is empty since model guard returns null
    expect(container.querySelector('.automl-model-details-header')).not.toBeInTheDocument();
  });

  it('should render sidebar navigation with correct sections', () => {
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );

    // Model viewer section tabs
    expect(screen.getByTestId('tab-model-information')).toBeInTheDocument();
    expect(screen.getByTestId('tab-feature-summary')).toBeInTheDocument();

    // Evaluation section tabs
    expect(screen.getByTestId('tab-model-evaluation')).toBeInTheDocument();
    expect(screen.getByTestId('tab-confusion-matrix')).toBeInTheDocument();
  });

  it('should show model information tab by default', () => {
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );

    // The first tab (model-information) should be active
    const navButton = screen.getByTestId('tab-model-information');
    expect(navButton.className).toContain('automl-model-details-nav-item--active');
  });

  it('should switch tabs when a sidebar nav item is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );

    // Click on Feature Summary tab
    await user.click(screen.getByTestId('tab-feature-summary'));

    const featureTab = screen.getByTestId('tab-feature-summary');
    expect(featureTab.className).toContain('automl-model-details-nav-item--active');

    // Previous tab should no longer be active
    const modelInfoTab = screen.getByTestId('tab-model-information');
    expect(modelInfoTab.className).not.toContain('automl-model-details-nav-item--active');
  });

  it('should exclude confusion matrix and feature summary tabs for timeseries task type', () => {
    render(
      <AutomlResultsContext.Provider value={mockTimeseriesContext}>
        <AutomlModelDetailsModal {...defaultProps} modelName="TemporalFusionTransformer" />
      </AutomlResultsContext.Provider>,
    );

    expect(screen.getByTestId('tab-model-information')).toBeInTheDocument();
    expect(screen.getByTestId('tab-model-evaluation')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-feature-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-confusion-matrix')).not.toBeInTheDocument();
  });

  it('should exclude confusion matrix tab for regression task type', () => {
    // Create a regression context by modifying the tabular context
    const regressionContext = {
      ...mockTabularContext,
      parameters: {
        ...mockTabularContext.parameters,
        task_type: 'regression' as const,
      },
    };

    render(
      <AutomlResultsContext.Provider value={regressionContext}>
        <AutomlModelDetailsModal {...defaultProps} modelName="CatBoost_BAG_L2_FULL" />
      </AutomlResultsContext.Provider>,
    );

    expect(screen.queryByTestId('tab-confusion-matrix')).not.toBeInTheDocument();
  });

  it('should render section headers in sidebar', () => {
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );

    expect(screen.getByText('Model viewer')).toBeInTheDocument();
    expect(screen.getByText('Evaluation')).toBeInTheDocument();
  });

  it('should display tooltip icon next to tab title', () => {
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );

    // Each active tab should have a tooltip button
    expect(screen.getByLabelText('Model information info')).toBeInTheDocument();
  });

  it('should render Download button and Save as dropdown', () => {
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} onClickSaveNotebook={jest.fn()} />
      </AutomlResultsContext.Provider>,
    );

    expect(screen.getByTestId('model-details-download')).toBeInTheDocument();
    expect(screen.getByTestId('model-details-actions-toggle')).toBeInTheDocument();
  });

  it('should call onClose when modal close is triggered', async () => {
    const onClose = jest.fn();
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} onClose={onClose} />
      </AutomlResultsContext.Provider>,
    );

    // PF Modal renders a close button
    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should switch model when a different model is selected via dropdown', async () => {
    const user = userEvent.setup();
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );

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
    // Create a regression context by modifying the tabular context
    const regressionContext = {
      ...mockTabularContext,
      parameters: {
        ...mockTabularContext.parameters,
        task_type: 'regression' as const,
      },
    };

    render(
      <AutomlResultsContext.Provider value={regressionContext}>
        <AutomlModelDetailsModal {...defaultProps} modelName="CatBoost_BAG_L2_FULL" />
      </AutomlResultsContext.Provider>,
    );

    const downloadButton = screen.getByTestId('model-details-download');
    expect(downloadButton).toBeEnabled();
  });

  it('should disable download button for non-timeseries without feature importance', () => {
    const { useModelEvaluationArtifactsQuery } = jest.requireMock('~/app/hooks/queries');
    useModelEvaluationArtifactsQuery.mockReturnValue({
      featureImportance: undefined,
      confusionMatrix: undefined,
      isLoading: false,
    });

    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} />
      </AutomlResultsContext.Provider>,
    );

    const downloadButton = screen.getByTestId('model-details-download');
    expect(downloadButton).toBeDisabled();
  });

  it('should enable download button for timeseries without feature importance', () => {
    const { useModelEvaluationArtifactsQuery } = jest.requireMock('~/app/hooks/queries');
    useModelEvaluationArtifactsQuery.mockReturnValue({
      featureImportance: undefined,
      confusionMatrix: undefined,
      isLoading: false,
    });

    render(
      <AutomlResultsContext.Provider value={mockTimeseriesContext}>
        <AutomlModelDetailsModal {...defaultProps} modelName="TemporalFusionTransformer" />
      </AutomlResultsContext.Provider>,
    );

    const downloadButton = screen.getByTestId('model-details-download');
    expect(downloadButton).toBeEnabled();
  });

  it('should call onClickSaveNotebook when "Save as notebook" is clicked in dropdown', async () => {
    const onClickSaveNotebook = jest.fn();
    const user = userEvent.setup();

    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} onClickSaveNotebook={onClickSaveNotebook} />
      </AutomlResultsContext.Provider>,
    );

    await user.click(screen.getByTestId('model-details-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Save as notebook' }));

    expect(onClickSaveNotebook).toHaveBeenCalledWith('CatBoost_BAG_L2_FULL');
    expect(onClickSaveNotebook).toHaveBeenCalledTimes(1);
  });

  it('should call onClickSaveNotebook with current model when model is switched', async () => {
    const onClickSaveNotebook = jest.fn();
    const user = userEvent.setup();

    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal {...defaultProps} onClickSaveNotebook={onClickSaveNotebook} />
      </AutomlResultsContext.Provider>,
    );

    // Switch to a different model
    const toggle = screen.getByTestId('model-selector-dropdown');
    await user.click(toggle);
    await user.click(screen.getByText('RandomForest_BAG_L1_FULL'));

    // Click save notebook via dropdown
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Save as notebook' }));

    // Should be called with the newly selected model
    expect(onClickSaveNotebook).toHaveBeenCalledWith('RandomForest_BAG_L1_FULL');
  });

  it('should call onRegisterModel and onClose when "Register model" is clicked', async () => {
    const onRegisterModel = jest.fn();
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal
          {...defaultProps}
          onClose={onClose}
          onRegisterModel={onRegisterModel}
        />
      </AutomlResultsContext.Provider>,
    );

    await user.click(screen.getByTestId('model-details-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Register model' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRegisterModel).toHaveBeenCalledWith('CatBoost_BAG_L2_FULL');
    expect(onRegisterModel).toHaveBeenCalledTimes(1);
  });

  it('should call onRegisterModel with current model when model is switched', async () => {
    const onRegisterModel = jest.fn();
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal
          {...defaultProps}
          onClose={onClose}
          onRegisterModel={onRegisterModel}
        />
      </AutomlResultsContext.Provider>,
    );

    // Switch to a different model
    const toggle = screen.getByTestId('model-selector-dropdown');
    await user.click(toggle);
    await user.click(screen.getByText('RandomForest_BAG_L1_FULL'));

    // Click register model via dropdown
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Register model' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRegisterModel).toHaveBeenCalledWith('RandomForest_BAG_L1_FULL');
  });

  it('should render print portal with all visible tabs when download is clicked', async () => {
    const user = userEvent.setup();
    const printSpy = jest.spyOn(window, 'print').mockReturnValue(undefined);

    try {
      render(
        <AutomlResultsContext.Provider value={mockTabularContext}>
          <AutomlModelDetailsModal {...defaultProps} />
        </AutomlResultsContext.Provider>,
      );

      // Click download to trigger isPrinting
      const downloadButton = screen.getByTestId('model-details-download');
      await user.click(downloadButton);

      // Print container should be portalled to document.body
      const printContainer = screen.getByTestId('print-container');
      expect(printContainer.parentElement).toBe(document.body);

      // Should render a page for each visible tab (tabular: 4 tabs)
      expect(screen.getByTestId('print-page-model-information')).toBeInTheDocument();
      expect(screen.getByTestId('print-page-feature-summary')).toBeInTheDocument();
      expect(screen.getByTestId('print-page-model-evaluation')).toBeInTheDocument();
      expect(screen.getByTestId('print-page-confusion-matrix')).toBeInTheDocument();

      // Each page should have a header with the model name
      const pages = printContainer.querySelectorAll('.automl-print-page');
      pages.forEach((page) => {
        expect(within(page as HTMLElement).getByText('CatBoost_BAG_L2_FULL')).toBeInTheDocument();
      });

      // First page should have the --first modifier
      expect(screen.getByTestId('print-page-model-information')).toHaveClass(
        'automl-print-page--first',
      );
      // Second page should NOT have --first
      expect(screen.getByTestId('print-page-feature-summary')).not.toHaveClass(
        'automl-print-page--first',
      );

      expect(printSpy).toHaveBeenCalledTimes(1);
    } finally {
      printSpy.mockRestore();
    }
  });

  it('should not render Save as dropdown when neither callback is provided', () => {
    render(
      <AutomlResultsContext.Provider value={mockTabularContext}>
        <AutomlModelDetailsModal
          {...defaultProps}
          onClickSaveNotebook={undefined}
          onRegisterModel={undefined}
        />
      </AutomlResultsContext.Provider>,
    );

    expect(screen.queryByTestId('model-details-actions-toggle')).not.toBeInTheDocument();
  });
});
