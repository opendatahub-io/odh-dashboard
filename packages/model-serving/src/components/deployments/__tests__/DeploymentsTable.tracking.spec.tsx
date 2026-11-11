import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TrackingProvider } from '../../../__tests__/TrackingProvider';
import { mockInferenceServiceK8sResource } from '../../../__mocks__/mockInferenceServiceK8sResource';
import DeploymentsTable from '../DeploymentsTable';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: () => ({ status: false }),
}));

jest.mock('../../../concepts/extensionHelpers/PlatformExtensionDataLoader', () => ({
  ...jest.requireActual('../../../concepts/extensionHelpers/PlatformExtensionDataLoader'),
  PlatformExtensionDataLoader: () => null,
}));

jest.mock('../../../concepts/extensionHelpers/usePlatformExtensionDataMap', () => ({
  usePlatformExtensionDataMap: () => ({ extensionDataMap: {}, onLoad: jest.fn() }),
}));

jest.mock('../../../concepts/extensionUtils', () => ({
  useResolvedDeploymentExtension: () => [
    { properties: { title: 'Delete model deployment?', onDelete: mockDelete } },
    true,
  ],
}));

jest.mock('../row/DeploymentsTableRow', () => ({
  DeploymentRow: ({ onDelete }: { onDelete: () => void }) => (
    <tr>
      <td>
        <button onClick={onDelete}>Delete deployment</button>
      </td>
    </tr>
  ),
}));

const mockDelete = jest.fn();

const deployment = {
  modelServingPlatformId: 'kserve',
  model: mockInferenceServiceK8sResource({ displayName: 'Test model' }),
};

describe('DeploymentsTable tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue(undefined);
  });

  it.each([
    { deleted: true, payload: { outcome: 'submit', type: 'single' } },
    { deleted: false, payload: { outcome: 'cancel', type: 'single' } },
  ])(
    'should forward exactly one deletion event when deleted=$deleted',
    async ({ deleted, payload }) => {
      const trackEvent = jest.fn();
      render(
        <TrackingProvider trackEvent={trackEvent}>
          <DeploymentsTable deployments={[deployment]} loaded />
        </TrackingProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Delete deployment' }));
      expect(trackEvent).not.toHaveBeenCalled();
      if (deleted) {
        fireEvent.change(screen.getByLabelText('Delete modal input'), {
          target: { value: 'Test model' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      }
      await waitFor(() => expect(trackEvent).toHaveBeenCalledTimes(1));
      expect(trackEvent).toHaveBeenCalledWith('Model Deleted', payload);
      expect(trackEvent.mock.calls[0][1]).not.toHaveProperty('success');
      expect(mockDelete).toHaveBeenCalledTimes(deleted ? 1 : 0);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );
});
