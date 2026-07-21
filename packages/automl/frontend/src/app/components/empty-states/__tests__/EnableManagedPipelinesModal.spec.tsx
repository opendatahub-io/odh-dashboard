import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EnableManagedPipelinesModal from '~/app/components/empty-states/EnableManagedPipelinesModal';

jest.mock(
  '@odh-dashboard/internal/concepts/pipelines/content/configurePipelinesServer/ManagedPipelinesSettingsSection',
  () => {
    const MockManagedPipelinesSettingsSection = ({
      enableManagedPipelines,
      setEnableManagedPipelines,
    }: {
      enableManagedPipelines: boolean;
      setEnableManagedPipelines: (v: boolean) => void;
    }) => (
      <label>
        <input
          data-testid="mock-checkbox"
          type="checkbox"
          checked={enableManagedPipelines}
          onChange={(e) => setEnableManagedPipelines(e.target.checked)}
        />
        Enable managed pipelines
      </label>
    );
    MockManagedPipelinesSettingsSection.displayName = 'MockManagedPipelinesSettingsSection';
    return MockManagedPipelinesSettingsSection;
  },
);

describe('EnableManagedPipelinesModal', () => {
  it('renders modal with correct title', () => {
    render(<EnableManagedPipelinesModal onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Enable AutoML pipelines' })).toBeInTheDocument();
  });

  it('renders warning text about pipeline restart', () => {
    render(<EnableManagedPipelinesModal onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText(/restart the pipeline server.*interrupt/)).toBeInTheDocument();
  });

  it('submit button is disabled when checkbox is unchecked', () => {
    render(<EnableManagedPipelinesModal onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Enable AutoML pipelines' })).toBeDisabled();
  });

  it('submit button is enabled after checking the checkbox', () => {
    render(<EnableManagedPipelinesModal onConfirm={jest.fn()} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('mock-checkbox'));

    expect(screen.getByRole('button', { name: 'Enable AutoML pipelines' })).toBeEnabled();
  });

  it('calls onConfirm when submit is clicked', () => {
    const onConfirm = jest.fn();
    render(<EnableManagedPipelinesModal onConfirm={onConfirm} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('mock-checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enable AutoML pipelines' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    render(<EnableManagedPipelinesModal onConfirm={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
