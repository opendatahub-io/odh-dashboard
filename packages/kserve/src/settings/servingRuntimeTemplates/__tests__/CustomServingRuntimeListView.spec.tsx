import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import useDraggableTable from '@odh-dashboard/internal/utilities/useDraggableTable';
import { patchDashboardConfigTemplateOrderBackend } from '@odh-dashboard/internal/services/dashboardService';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';
import { CustomServingRuntimeContext } from '../CustomServingRuntimeContext';
import CustomServingRuntimeListView from '../CustomServingRuntimeListView';

jest.mock('@odh-dashboard/internal/utilities/useDraggableTable', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/services/dashboardService', () => ({
  patchDashboardConfigTemplateOrderBackend: jest.fn(),
}));
jest.mock('../CustomServingRuntimeTableRow', () => ({
  __esModule: true,
  default: () => null,
}));

const mockPatchOrder = jest.mocked(patchDashboardConfigTemplateOrderBackend);

const renderList = () => {
  const providers = createTestProviders({ dashboardNamespace: 'custom-dashboard' });
  const refreshOrder = jest.fn();
  const context = {
    refreshData: jest.fn(),
    servingRuntimeTemplates: [
      [mockServingRuntimeTemplateK8sResource({ name: 'my-runtime' })],
      true,
      undefined,
    ],
    servingRuntimeTemplateOrder: { data: [], loaded: true, refresh: refreshOrder },
    servingRuntimeTemplateDisablement: { data: [], loaded: true, refresh: jest.fn() },
  } satisfies React.ContextType<typeof CustomServingRuntimeContext>;

  render(
    <MemoryRouter>
      <CustomServingRuntimeContext.Provider value={context}>
        <CustomServingRuntimeListView />
      </CustomServingRuntimeContext.Provider>
    </MemoryRouter>,
    { wrapper: providers.wrapper },
  );
  return { ...providers, refreshOrder };
};

describe('CustomServingRuntimeListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDraggableTable).mockReturnValue({
      tableProps: {
        className: undefined,
        tbodyProps: { onDragOver: jest.fn(), onDragLeave: jest.fn(), ref: { current: null } },
      },
      rowProps: { onDragStart: jest.fn(), onDragEnd: jest.fn(), onDrop: jest.fn() },
    });
  });

  it('should persist ordering in the host namespace and refresh it after success', async () => {
    mockPatchOrder.mockResolvedValue(['my-runtime']);
    const { refreshOrder } = renderList();

    act(() => jest.mocked(useDraggableTable).mock.calls[0][1](['my-runtime']));

    await waitFor(() => expect(refreshOrder).toHaveBeenCalledTimes(1));
    expect(mockPatchOrder).toHaveBeenCalledWith(['my-runtime'], 'custom-dashboard');
  });

  it('should notify the host when persisting ordering fails', async () => {
    mockPatchOrder.mockRejectedValue(new Error('Order denied'));
    const { notification, refreshOrder } = renderList();

    act(() => jest.mocked(useDraggableTable).mock.calls[0][1](['my-runtime']));

    await waitFor(() => {
      expect(notification.error).toHaveBeenCalledWith(
        'Error updating the serving runtimes order',
        'Order denied',
      );
    });
    expect(mockPatchOrder).toHaveBeenCalledWith(['my-runtime'], 'custom-dashboard');
    expect(refreshOrder).not.toHaveBeenCalled();
  });
});
