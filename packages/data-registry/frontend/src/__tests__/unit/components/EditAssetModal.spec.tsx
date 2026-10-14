/* eslint-disable camelcase */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditAssetModal from '~/app/components/EditAssetModal';
import * as connectionsHook from '~/app/hooks/useConnections';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';

jest.mock('~/app/hooks/useConnections');

const mockUseConnections = jest.mocked(connectionsHook.useConnections);

const asset = mockAssetResponse({
  name: 'claims-data',
  labels: ['production'],
  connection_ref: { type: 'rhai', secret_name: 'minio-connection' },
});

describe('EditAssetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnections.mockReturnValue([[], true, undefined]);
  });

  it('should hide while opening project label management and restore on return', async () => {
    const user = userEvent.setup();
    let returnToEdit: (() => void) | undefined;
    const onManageLabels = jest.fn((onReturnToEdit?: () => void) => {
      returnToEdit = onReturnToEdit;
    });

    const TestHarness: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(true);

      return (
        <EditAssetModal
          isOpen={isOpen}
          asset={asset}
          assetKind="table"
          project="test-project"
          collection="analytics"
          name="claims-data"
          onClose={jest.fn()}
          onSaved={jest.fn()}
          onManageLabels={() => {
            setIsOpen(false);
            onManageLabels(() => setIsOpen(true));
          }}
        />
      );
    };

    render(<TestHarness />);

    expect(screen.getByTestId('edit-asset-modal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Manage labels' }));

    expect(onManageLabels).toHaveBeenCalledWith(expect.any(Function));
    await waitFor(() => expect(screen.queryByTestId('edit-asset-modal')).not.toBeInTheDocument());

    act(() => returnToEdit?.());
    await waitFor(() => expect(screen.getByTestId('edit-asset-modal')).toBeInTheDocument());
  });

  it('should preserve unsaved values when label management refreshes the same asset', async () => {
    const user = userEvent.setup();
    let returnToEdit: (() => void) | undefined;
    const onManageLabels = jest.fn((onReturnToEdit?: () => void) => {
      returnToEdit = onReturnToEdit;
    });

    const TestHarness: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(true);
      const [currentAsset, setCurrentAsset] = React.useState(asset);

      return (
        <EditAssetModal
          isOpen={isOpen}
          asset={currentAsset}
          assetKind="table"
          project="test-project"
          collection="analytics"
          name="claims-data"
          onClose={jest.fn()}
          onSaved={jest.fn()}
          onManageLabels={() => {
            setIsOpen(false);
            setCurrentAsset({ ...asset, description: 'server-refreshed-description' });
            onManageLabels(() => setIsOpen(true));
          }}
        />
      );
    };

    render(<TestHarness />);

    const description = screen.getByTestId('data-description-input');
    await user.clear(description);
    await user.type(description, 'edited locally');
    await user.click(screen.getByRole('button', { name: 'Manage labels' }));

    returnToEdit?.();
    await waitFor(() => expect(screen.getByTestId('edit-asset-modal')).toBeInTheDocument());
    expect(screen.getByTestId('data-description-input')).toHaveValue('edited locally');
  });

  it('should synchronize labels when refreshed labels were not edited locally', async () => {
    const user = userEvent.setup();
    let returnToEdit: (() => void) | undefined;
    const assetWithDeletedLabel = { ...asset, labels: ['production', 'to-be-deleted'] };
    const onManageLabels = jest.fn((onReturnToEdit?: () => void) => {
      returnToEdit = onReturnToEdit;
    });

    const TestHarness: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(true);
      const [currentAsset, setCurrentAsset] = React.useState(assetWithDeletedLabel);

      return (
        <EditAssetModal
          isOpen={isOpen}
          asset={currentAsset}
          assetKind="table"
          project="test-project"
          collection="analytics"
          name="claims-data"
          onClose={jest.fn()}
          onSaved={jest.fn()}
          onManageLabels={() => {
            setIsOpen(false);
            setCurrentAsset({ ...assetWithDeletedLabel, labels: ['production'] });
            onManageLabels(() => setIsOpen(true));
          }}
        />
      );
    };

    render(<TestHarness />);

    expect(screen.getByTestId('data-labels-input-1')).toHaveValue('to-be-deleted');
    await user.click(screen.getByRole('button', { name: 'Manage labels' }));

    act(() => returnToEdit?.());
    await waitFor(() => expect(screen.getByTestId('edit-asset-modal')).toBeInTheDocument());
    expect(screen.queryByTestId('data-labels-input-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('data-labels-input-0')).toHaveValue('production');
  });
});
