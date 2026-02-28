import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ContinueCondition,
  useContinueState,
} from '#~/pages/pipelines/global/modelCustomization/startRunModal/useContinueState';
import MissingConditionAlert from '#~/pages/pipelines/global/modelCustomization/startRunModal/MissingConditionAlert';
import '@testing-library/jest-dom';

jest.mock('#~/pages/pipelines/global/modelCustomization/startRunModal/useContinueState', () => ({
  useContinueState: jest.fn(),
}));

describe('MissingConditionAlert', () => {
  const TEST_PROJECT = 'test-project';

  const setIsLoadingProject = jest.fn();
  const setCanContinue = jest.fn();
  const useContinueStateMock = useContinueState as jest.Mock;

  const renderComponent = () =>
    render(
      <MissingConditionAlert
        selectedProject={TEST_PROJECT}
        setIsLoadingProject={setIsLoadingProject}
        setCanContinue={setCanContinue}
      />,
    );

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not render the alert when there are no unmet conditions', () => {
    useContinueStateMock.mockReturnValue({
      canContinue: true,
      isLoading: false,
      unmetCondition: null,
    });

    renderComponent();
    expect(screen.queryByTestId('missing-condition-alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('go-to-pipelines')).not.toBeInTheDocument();
  });

  it('should not render the alert when it is still loading', () => {
    useContinueStateMock.mockReturnValue({
      canContinue: false,
      isLoading: true,
      unmetCondition: null,
    });

    renderComponent();
    expect(screen.queryByTestId('missing-condition-alert')).not.toBeInTheDocument();
  });

  it.each<ContinueCondition>([
    'ilabPipelineInstalled',
    'pipelineServerConfigured',
    'pipelineServerAccessible',
    'pipelineServerOnline',
  ])(
    "should render the alert when the '%s' condition is unmet",
    async (unmetCondition: ContinueCondition) => {
      useContinueStateMock.mockReturnValue({
        canContinue: false,
        isLoading: false,
        unmetCondition,
      });

      renderComponent();

      await waitFor(() =>
        expect(screen.getByTestId('missing-condition-alert')).toBeInTheDocument(),
      );
    },
  );

  it('should render a link to pipeline definitions', async () => {
    useContinueStateMock.mockReturnValue({
      canContinue: false,
      isLoading: false,
      unmetCondition: 'pipelineServerConfigured',
    });

    renderComponent();

    await waitFor(() => expect(screen.getByTestId('missing-condition-alert')).toBeInTheDocument());
    const button = screen.getByTestId('go-to-pipelines');
    expect(button).toHaveAttribute('href', `/develop-train/pipelines/definitions/${TEST_PROJECT}`);
    await userEvent.click(button);
  });
});
