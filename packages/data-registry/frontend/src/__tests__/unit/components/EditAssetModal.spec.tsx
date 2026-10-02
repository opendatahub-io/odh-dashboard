/* eslint-disable camelcase */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditAssetModal from '~/app/components/EditAssetModal';
import { useConnections } from '~/app/hooks/useConnections';
import { updateGenericTable, updateVolume } from '~/app/api/dataRegistry';
import { mockDchConnection, mockRhaiConnection } from '~/__mocks__/mockConnection';
import { mockAssetResponse } from '~/__mocks__/mockAssetResponse';
import { mockVolumeInfo } from '~/__mocks__/mockVolumeInfo';
import { ConnectionRef } from '~/app/types';

jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/api/dataRegistry');
const refresh = jest.fn();
const onSaved = jest.fn();
const dch = mockDchConnection();
const legacy = mockRhaiConnection();

const renderEdit = (kind: 'table' | 'volume', ref: ConnectionRef = legacy) => {
  const props = {
    project: 'project-a',
    collection: 'collection-a',
    name: 'asset-a',
    onClose: jest.fn(),
    onSaved,
  };
  return render(
    kind === 'table' ? (
      <EditAssetModal
        {...props}
        assetKind="table"
        asset={mockAssetResponse({ connection_ref: ref, columns: [] })}
      />
    ) : (
      <EditAssetModal
        {...props}
        assetKind="volume"
        asset={mockVolumeInfo({ connection_ref: ref })}
      />
    ),
  );
};

describe.each(['table', 'volume'] as const)('EditAssetModal %s connections', (kind) => {
  const update = kind === 'table' ? jest.mocked(updateGenericTable) : jest.mocked(updateVolume);
  beforeEach(() => {
    jest.clearAllMocks();
    refresh.mockResolvedValue([dch]);
    jest.mocked(useConnections).mockReturnValue([[dch], true, undefined, refresh, []]);
  });

  it('should preserve an unresolved reference during unrelated edits without confirming it', async () => {
    const user = userEvent.setup();
    jest.mocked(useConnections).mockReturnValue([[], false, new Error('Forbidden'), refresh, []]);
    renderEdit(kind);
    expect(screen.getByTestId('data-connection-toggle')).toHaveTextContent(
      legacy.name ?? legacy.secret_name,
    );
    await user.type(screen.getByTestId('data-description-input'), ' Updated');
    await user.click(screen.getByTestId('edit-asset-save'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][3]).not.toHaveProperty('connection_ref');
    expect(refresh).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('should explicitly replace a legacy reference with the selected DCH UUID', async () => {
    const user = userEvent.setup();
    renderEdit(kind);
    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(
      within(screen.getByTestId(`connection-option-dch:${dch.id}`)).getByRole('option'),
    );
    await user.click(screen.getByTestId('edit-asset-save'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][3].connection_ref).toEqual({ type: 'dch', id: dch.id });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should resolve a saved DCH reference using its current display name', async () => {
    renderEdit(kind, { type: 'dch', id: dch.id });
    expect(screen.getByTestId('data-connection-toggle')).toHaveTextContent('Production data');
  });

  it('should block a changed reference when confirmation fails', async () => {
    const user = userEvent.setup();
    refresh.mockRejectedValue(new Error('Unable to confirm the selected connection'));
    renderEdit(kind);
    await user.click(screen.getByTestId('data-connection-toggle'));
    await user.click(
      within(screen.getByTestId(`connection-option-dch:${dch.id}`)).getByRole('option'),
    );
    await user.click(screen.getByTestId('edit-asset-save'));
    await waitFor(() =>
      expect(screen.getByTestId('edit-asset-error')).toHaveTextContent('Unable to confirm'),
    );
    expect(update).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
  it.each([
    mockDchConnection({ id: '550e8400-e29b-41d4-a716-446655440005' }),
    mockRhaiConnection(),
  ])('should replace an existing DCH reference with %j', async (replacement) => {
    const user = userEvent.setup();
    jest.mocked(useConnections).mockReturnValue([[replacement], true, undefined, refresh, []]);
    refresh.mockResolvedValue([replacement]);
    renderEdit(kind, dch);
    await user.click(screen.getByTestId('data-connection-toggle'));
    const key =
      replacement.type === 'dch' ? `dch:${replacement.id}` : `rhai:${replacement.secret_name}`;
    await user.click(within(screen.getByTestId(`connection-option-${key}`)).getByRole('option'));
    await user.click(screen.getByTestId('edit-asset-save'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][3].connection_ref).toEqual(
      replacement.type === 'dch'
        ? { type: 'dch', id: replacement.id }
        : { type: 'rhai', secret_name: replacement.secret_name },
    );
  });
});
