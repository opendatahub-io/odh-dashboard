import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectionModal } from '#~/concepts/modelRegistry/content/ConnectionModal';
import { ModelLocationType } from '#~/concepts/modelRegistry/types';

jest.mock('#~/pages/projects/screens/detail/connections/useServingConnections', () => ({
  __esModule: true,
  default: () => [[], true, undefined],
}));

jest.mock('#~/concepts/projects/ProjectSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="project-selector" />,
}));

describe('ConnectionModal', () => {
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
    const autofillButton = screen.getByTestId('autofill-modal-button');
    expect(autofillButton).toBeDisabled();
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
    screen.getByTestId('cancel-autofill-button').click();
    expect(onClose).toHaveBeenCalled();
  });
});
