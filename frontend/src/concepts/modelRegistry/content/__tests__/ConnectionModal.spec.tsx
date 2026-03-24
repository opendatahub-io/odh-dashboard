import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectionModal } from '#~/concepts/modelRegistry/content/ConnectionModal';
import { ModelLocationType } from '#~/concepts/modelRegistry/types';
import { Connection } from '#~/concepts/connectionTypes/types';

const mockConnection: Connection = {
  metadata: { name: 'test-conn', namespace: 'test-ns' },
  data: { URI: 'aHR0cHM6Ly9leGFtcGxlLmNvbQ==' },
} as unknown as Connection;

let capturedOnSelect: ((conn: Connection) => void) | undefined;

jest.mock('#~/concepts/projects/ProjectSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="project-selector" />,
}));

jest.mock('#~/concepts/modelRegistry/content/ConnectionDropdown', () => ({
  ConnectionDropdown: ({ onSelect }: { onSelect: (conn: Connection) => void }) => {
    capturedOnSelect = onSelect;
    return <div data-testid="connection-dropdown" />;
  },
}));

describe('ConnectionModal', () => {
  beforeEach(() => {
    capturedOnSelect = undefined;
  });

  it('renders with object storage type', () => {
    render(
      <ConnectionModal
        type={ModelLocationType.ObjectStorage}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText('Autofill from connection')).toBeInTheDocument();
    expect(screen.getByText(/object storage connections/)).toBeInTheDocument();
    expect(screen.getByTestId('project-selector')).toBeInTheDocument();
  });

  it('renders with URI type', () => {
    render(
      <ConnectionModal type={ModelLocationType.URI} onClose={jest.fn()} onSubmit={jest.fn()} />,
    );
    expect(screen.getByText(/URI connections/)).toBeInTheDocument();
  });

  it('has Autofill button disabled by default', () => {
    render(
      <ConnectionModal
        type={ModelLocationType.ObjectStorage}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('autofill-modal-button')).toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(
      <ConnectionModal
        type={ModelLocationType.ObjectStorage}
        onClose={onClose}
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('cancel-autofill-button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSubmit with the selected connection when Autofill is clicked', () => {
    const onSubmit = jest.fn();
    render(
      <ConnectionModal
        type={ModelLocationType.ObjectStorage}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(capturedOnSelect).toBeDefined();
    React.act(() => {
      if (capturedOnSelect) {
        capturedOnSelect(mockConnection);
      }
    });

    expect(screen.getByTestId('autofill-modal-button')).toBeEnabled();
    fireEvent.click(screen.getByTestId('autofill-modal-button'));
    expect(onSubmit).toHaveBeenCalledWith(mockConnection);
  });
});
