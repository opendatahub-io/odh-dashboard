import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTemplates } from '@odh-dashboard/internal/api';
import { createTestProviders } from '../../../__tests__/hostApiTestUtils';
import CustomServingRuntimeContextProvider from '../CustomServingRuntimeContext';
import useTemplateOrder from '../useTemplateOrder';
import useTemplateDisablement from '../useTemplateDisablement';

jest.mock('@odh-dashboard/internal/api', () => ({ useTemplates: jest.fn() }));
jest.mock('../useTemplateOrder', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../useTemplateDisablement', () => ({ __esModule: true, default: jest.fn() }));

describe('CustomServingRuntimeContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useTemplates).mockReturnValue([[], true, undefined]);
    jest.mocked(useTemplateOrder).mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    jest.mocked(useTemplateDisablement).mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should load templates and their settings from the host namespace', () => {
    const { wrapper } = createTestProviders({ dashboardNamespace: 'custom-dashboard' });
    render(
      <CustomServingRuntimeContextProvider>
        <span>Templates loaded</span>
      </CustomServingRuntimeContextProvider>,
      { wrapper },
    );

    expect(screen.getByText('Templates loaded')).toBeInTheDocument();
    expect(useTemplates).toHaveBeenCalledWith('custom-dashboard');
    expect(useTemplateOrder).toHaveBeenCalledWith('custom-dashboard', true, {
      refreshRate: 120000,
    });
    expect(useTemplateDisablement).toHaveBeenCalledWith('custom-dashboard', true, {
      refreshRate: 120000,
    });
  });
});
