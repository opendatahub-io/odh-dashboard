/* eslint-disable camelcase */
import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import AutoragExperimentSettings from '~/app/components/configure/AutoragExperimentSettings';
import { createConfigureSchema, type ConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: (props: Record<string, unknown>) => <button {...props} />,
}));

const configureSchema = createConfigureSchema();
const models = [
  { id: 'model-a', display_name: 'Model A', ready: true },
  { id: 'model-b', display_name: 'Model B', ready: true },
  { id: 'model-c', display_name: 'Model C', ready: true },
];

type EscapeHarnessProps = {
  onClose: () => void;
  revertChanges: () => void;
};

const EscapeHarness: React.FC<EscapeHarnessProps> = ({ onClose, revertChanges }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: {
      ...configureSchema.defaults,
      generation_models: ['model-a'],
      embedding_models: ['model-b'],
    },
  });

  return (
    <>
      <FormProvider {...(form as UseFormReturn<ConfigureSchema>)}>
        <AutoragExperimentSettings
          isOpen={isOpen}
          onClose={() => {
            onClose();
            setIsOpen(false);
          }}
          revertChanges={revertChanges}
          models={models}
          modelsLoaded
          modelsLoading={false}
        />
      </FormProvider>
      <button type="button" data-testid="reopen-modal" onClick={() => setIsOpen(true)}>
        Reopen
      </button>
    </>
  );
};

describe('AutoragExperimentSettings Escape handling', () => {
  it('should dismiss a visible tooltip before cancelling the real modal and reverting its draft', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const revertChanges = jest.fn();

    render(<EscapeHarness onClose={onClose} revertChanges={revertChanges} />);

    await user.click(screen.getByTestId('llm-model-checkbox-model-c'));
    await user.click(screen.getByTestId('embedding-models-tab'));

    const tooltipTrigger = screen.getByTestId('embedding-disabled-model-tooltip-model-a');
    tooltipTrigger.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'This model is already selected as a foundation model.',
    );

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
    expect(revertChanges).not.toHaveBeenCalled();
    expect(screen.getByTestId('experiment-settings-modal')).toBeInTheDocument();
    expect(screen.getByTestId('llm-model-checkbox-model-c')).toBeChecked();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(revertChanges).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('experiment-settings-modal')).not.toBeInTheDocument();
    });

    await user.click(screen.getByTestId('reopen-modal'));
    await waitFor(() => {
      expect(screen.getByTestId('llm-model-checkbox-model-c')).not.toBeChecked();
    });
  });

  it('should preserve the embedding draft before cancelling the real modal', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const revertChanges = jest.fn();

    render(<EscapeHarness onClose={onClose} revertChanges={revertChanges} />);

    await user.click(screen.getByTestId('embedding-models-tab'));
    await user.click(screen.getByTestId('embedding-model-checkbox-model-c'));
    await user.click(screen.getByTestId('foundation-models-tab'));

    const tooltipTrigger = screen.getByTestId('llm-disabled-model-tooltip-model-c');
    tooltipTrigger.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'This model is already selected as an embedding model.',
    );

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
    expect(revertChanges).not.toHaveBeenCalled();
    expect(screen.getByTestId('embedding-model-checkbox-model-c')).toBeChecked();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(revertChanges).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('experiment-settings-modal')).not.toBeInTheDocument();
    });

    await user.click(screen.getByTestId('reopen-modal'));
    await waitFor(() => {
      expect(screen.getByTestId('embedding-model-checkbox-model-c')).not.toBeChecked();
    });
  });

  it('should dismiss a hover-only tooltip before the real modal handles Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const revertChanges = jest.fn();

    render(<EscapeHarness onClose={onClose} revertChanges={revertChanges} />);

    await user.click(screen.getByTestId('llm-model-checkbox-model-c'));
    await user.click(screen.getByTestId('embedding-models-tab'));

    const tooltipTrigger = screen.getByTestId('embedding-disabled-model-tooltip-model-a');
    await user.hover(tooltipTrigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('This model is already selected as a foundation model.');
    expect(tooltipTrigger).toHaveAttribute('aria-describedby');
    await user.hover(screen.getByTestId('embedding-disabled-model-tooltip-model-a-content'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    screen.getByTestId('models-to-test-help').focus();

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
    expect(revertChanges).not.toHaveBeenCalled();
    expect(screen.getByTestId('experiment-settings-modal')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(revertChanges).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('experiment-settings-modal')).not.toBeInTheDocument();
    });
  });
});
