import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { deleteTemplateBackend } from '@odh-dashboard/internal/services/templateService';
import { patchDashboardConfigTemplateDisablementBackend } from '@odh-dashboard/internal/services/dashboardService';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';
import { CustomServingRuntimeContext } from '../CustomServingRuntimeContext';
import DeleteCustomServingRuntimeModal from '../DeleteCustomServingRuntimeModal';

jest.mock('@odh-dashboard/internal/services/templateService', () => ({
  deleteTemplateBackend: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/services/dashboardService', () => ({
  patchDashboardConfigTemplateDisablementBackend: jest.fn(),
}));

const mockDelete = jest.mocked(deleteTemplateBackend);
const mockPatchDisablement = jest.mocked(patchDashboardConfigTemplateDisablementBackend);

const renderModal = (disabled = false) => {
  const template = mockServingRuntimeTemplateK8sResource({
    name: 'my-runtime',
    namespace: 'runtime-namespace',
    displayName: 'My Runtime',
  });
  const onClose = jest.fn();
  const { wrapper, tracking } = createTestProviders({ dashboardNamespace: 'custom-dashboard' });
  const context = {
    refreshData: jest.fn(),
    servingRuntimeTemplates: [[template], true, undefined],
    servingRuntimeTemplateOrder: { data: [], loaded: true, refresh: jest.fn() },
    servingRuntimeTemplateDisablement: {
      data: disabled ? ['my-runtime'] : [],
      loaded: true,
      refresh: jest.fn(),
    },
  } satisfies React.ContextType<typeof CustomServingRuntimeContext>;

  render(
    <CustomServingRuntimeContext.Provider value={context}>
      <DeleteCustomServingRuntimeModal template={template} onClose={onClose} />
    </CustomServingRuntimeContext.Provider>,
    { wrapper },
  );
  return { onClose, template, tracking };
};

const confirmDeletion = () => {
  fireEvent.change(screen.getByTestId('delete-modal-input'), { target: { value: 'My Runtime' } });
  fireEvent.click(screen.getByTestId('delete-button'));
};

describe('DeleteCustomServingRuntimeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPatchDisablement.mockResolvedValue([]);
  });

  it('should require the display name before submitting deletion', () => {
    renderModal();
    expect(screen.getByTestId('delete-button')).toBeDisabled();

    const input = screen.getByTestId('delete-modal-input');
    fireEvent.change(input, { target: { value: 'Wrong Runtime' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('delete-button')).toBeDisabled();
    expect(mockDelete).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'My Runtime' } });
    expect(screen.getByTestId('delete-button')).toBeEnabled();
  });

  it('should cancel without changing the template or dashboard configuration', () => {
    const { onClose, tracking } = renderModal();
    fireEvent.click(screen.getByTestId('cancel-button'));

    expect(onClose).toHaveBeenCalledWith(false);
    expect(tracking.trackEvent.mock.calls).toEqual([
      ['Model Serving Serving Runtime Template Deleted', { outcome: 'cancel' }],
    ]);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockPatchDisablement).not.toHaveBeenCalled();
  });

  it('should use the host namespace for settings and the template namespace for deletion', async () => {
    const { onClose, template, tracking } = renderModal(true);
    mockDelete.mockResolvedValue(template);

    confirmDeletion();

    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
    expect(tracking.trackEvent.mock.calls).toEqual([
      ['Model Serving Serving Runtime Template Deleted', { outcome: 'submit', success: true }],
    ]);
    expect(mockPatchDisablement).toHaveBeenCalledWith([], 'custom-dashboard');
    expect(mockDelete).toHaveBeenCalledWith('my-runtime', 'runtime-namespace');
  });

  it('should keep deletion disabled while the request is pending', async () => {
    let resolveDelete: (value: TemplateKind) => void = () => undefined;
    mockDelete.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const { onClose, template } = renderModal();

    confirmDeletion();

    expect(screen.getByTestId('delete-button')).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId('delete-modal-input'), { key: 'Enter' });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockPatchDisablement).not.toHaveBeenCalled();

    resolveDelete(template);
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
  });

  it('should display an inline error and permit retry after a failed deletion', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Delete denied'));
    const { onClose, template, tracking } = renderModal();
    mockDelete.mockResolvedValueOnce(template);

    confirmDeletion();

    expect(await screen.findByTestId('delete-model-error-message-alert')).toHaveTextContent(
      'Delete denied',
    );
    expect(screen.getByTestId('delete-button')).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(tracking.trackEvent.mock.calls).toEqual([
      ['Model Serving Serving Runtime Template Deleted', { outcome: 'submit', success: false }],
    ]);

    fireEvent.click(screen.getByTestId('delete-button'));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
  });
});
