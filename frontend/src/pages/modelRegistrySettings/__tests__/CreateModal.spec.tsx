import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockModelRegistry } from '#~/__mocks__/mockModelRegistry';
import {
  createModelRegistryBackend,
  updateModelRegistryBackend,
} from '#~/services/modelRegistrySettingsService';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import CreateModal from '#~/pages/modelRegistrySettings/CreateModal';

jest.mock('#~/services/modelRegistrySettingsService');
jest.mock('#~/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: () => ({ status: false }),
}));
jest.mock('#~/concepts/areas/AreaContext', () => ({
  AreaContext: jest.requireActual('react').createContext({
    dscStatus: { components: { modelregistry: { registriesNamespace: 'odh-model-registries' } } },
  }),
}));
jest.mock('#~/concepts/modelRegistrySettings/useModelRegistryCertificateNames', () => ({
  __esModule: true,
  default: () => [{ configMaps: [], secrets: [] }, false, undefined],
}));

describe('CreateModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([false, true])('should keep registry errors in the UI only (edit=%s)', async (edit) => {
    const message = 'Private registry diagnostic';
    const api = edit ? updateModelRegistryBackend : createModelRegistryBackend;
    jest.mocked(api).mockRejectedValue(new Error(message));
    const registry = mockModelRegistry({});
    registry.spec.mysql = undefined;
    registry.spec.postgres = { generateDeployment: true };
    const onClose = jest.fn();
    const refresh = jest.fn();
    const user = userEvent.setup();
    render(
      <CreateModal
        modelRegistry={edit ? registry : undefined}
        onClose={onClose}
        refresh={refresh}
      />,
    );
    await user.clear(screen.getByTestId('mr-name'));
    await user.type(screen.getByTestId('mr-name'), 'Test registry');
    await user.click(screen.getByTestId('modal-submit-button'));
    expect(await screen.findByText(message)).toBeVisible();
    expect(api).toHaveBeenCalledTimes(1);
    expect(fireFormTrackingEvent).toHaveBeenCalledWith(
      edit ? 'Model Registry Updated' : 'Model Registry Created',
      expect.objectContaining({ success: false, error: 'unknown_error' }),
    );
    expect(JSON.stringify(jest.mocked(fireFormTrackingEvent).mock.calls)).not.toContain(message);
    expect(onClose).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
