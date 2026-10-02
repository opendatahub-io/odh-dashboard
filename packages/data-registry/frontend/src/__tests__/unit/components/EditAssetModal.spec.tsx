/* eslint-disable camelcase */
import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditAssetModal from '~/app/components/EditAssetModal';
import * as dataRegistryApi from '~/app/api/dataRegistry';
import * as connectionsHook from '~/app/hooks/useConnections';
import { mockDchConnection, mockRhaiConnection } from '~/__mocks__/mockConnection';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { ConnectionRef } from '~/app/types';

jest.mock('~/app/api/dataRegistry');
jest.mock('~/app/hooks/useConnections');

const mockUseConnections = jest.mocked(connectionsHook.useConnections);
const mockUpdateGenericTable = jest.mocked(dataRegistryApi.updateGenericTable);
const mockUpdateVolume = jest.mocked(dataRegistryApi.updateVolume);
const refreshConnections = jest.fn();
const dchConnection = mockDchConnection();
const rhaiConnection = mockRhaiConnection({ secret_name: 'minio-connection' });

const asset = mockAssetResponse({
  name: 'claims-data',
  labels: ['production'],
  connection_ref: { type: 'rhai', secret_name: 'minio-connection' },
});

describe('EditAssetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshConnections.mockResolvedValue([]);
    mockUseConnections.mockReturnValue([[], true, undefined, refreshConnections, []]);
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

  describe.each(['table', 'volume'] as const)('%s connection updates', (kind) => {
    const update = kind === 'table' ? mockUpdateGenericTable : mockUpdateVolume;
    const renderWithConnection = (connectionRef: ConnectionRef) => {
      const props = {
        assetKind: kind,
        project: 'test-project',
        collection: 'analytics',
        name: 'claims-data',
        onClose: jest.fn(),
        onSaved: jest.fn(),
      };
      return render(
        kind === 'table' ? (
          <EditAssetModal
            {...props}
            asset={mockAssetResponse({ connection_ref: connectionRef, columns: [] })}
          />
        ) : (
          <EditAssetModal
            {...props}
            asset={mockVolumeInfo({ connection_ref: connectionRef })}
          />
        ),
      );
    };

    beforeEach(() => {
      jest.clearAllMocks();
      refreshConnections.mockResolvedValue([dchConnection]);
      mockUseConnections.mockReturnValue([
        [dchConnection],
        true,
        undefined,
        refreshConnections,
        [],
      ]);
    });

    it('keeps an unresolved saved reference when the user edits other fields', async () => {
      const user = userEvent.setup();
      mockUseConnections.mockReturnValue([
        [],
        false,
        new Error('DCH is unavailable'),
        refreshConnections,
        [],
      ]);
      renderWithConnection(rhaiConnection);

      expect(screen.getByTestId('data-connection-toggle')).toHaveTextContent(
        'Connection unavailable',
      );
      await user.type(screen.getByTestId('data-description-input'), ' Updated');
      await user.click(screen.getByTestId('edit-asset-save'));

      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][3]).not.toHaveProperty('connection_ref');
      expect(refreshConnections).not.toHaveBeenCalled();
    });

    it('replaces a saved reference only after confirming the selected connection', async () => {
      const user = userEvent.setup();
      renderWithConnection(rhaiConnection);
      await user.click(screen.getByTestId('data-connection-toggle'));
      await user.click(
        within(screen.getByTestId(`connection-option-dch:${dchConnection.id}`)).getByRole(
          'option',
        ),
      );
      await user.click(screen.getByTestId('edit-asset-save'));

      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][3].connection_ref).toEqual({
        type: 'dch',
        id: dchConnection.id,
      });
      expect(refreshConnections).toHaveBeenCalledTimes(1);
    });

    it('resolves a saved DCH reference using its current display name', () => {
      renderWithConnection({ type: 'dch', id: dchConnection.id });
      expect(screen.getByTestId('data-connection-toggle')).toHaveTextContent('Production data');
    });

    it('blocks a replacement if refresh cannot confirm the selected connection', async () => {
      const user = userEvent.setup();
      refreshConnections.mockRejectedValue(new Error('Unable to confirm the selected connection'));
      renderWithConnection(rhaiConnection);
      await user.click(screen.getByTestId('data-connection-toggle'));
      await user.click(
        within(screen.getByTestId(`connection-option-dch:${dchConnection.id}`)).getByRole(
          'option',
        ),
      );
      await user.click(screen.getByTestId('edit-asset-save'));

      await waitFor(() =>
        expect(screen.getByTestId('edit-asset-error')).toHaveTextContent('Unable to confirm'),
      );
      expect(update).not.toHaveBeenCalled();
    });
  });
});
