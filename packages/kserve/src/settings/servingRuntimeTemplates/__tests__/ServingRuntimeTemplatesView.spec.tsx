import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import ServingRuntimeTemplatesView from '../ServingRuntimeTemplatesView';
import { CustomServingRuntimeContext } from '../CustomServingRuntimeContext';

jest.mock('../CustomServingRuntimeListView', () => ({
  __esModule: true,
  default: () => <div data-testid="list-view">List View</div>,
}));

const buildContextValue = (templates: TemplateKind[]) => ({
  refreshData: jest.fn(),
  servingRuntimeTemplates: [templates, true, undefined] as CustomWatchK8sResult<TemplateKind[]>,
  servingRuntimeTemplateOrder: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
  servingRuntimeTemplateDisablement: {
    data: [],
    loaded: true,
    error: undefined,
    refresh: jest.fn(),
  },
});

const renderView = (templates: TemplateKind[], noTitle?: boolean) =>
  render(
    <MemoryRouter>
      <CustomServingRuntimeContext.Provider value={buildContextValue(templates)}>
        <ServingRuntimeTemplatesView noTitle={noTitle} />
      </CustomServingRuntimeContext.Provider>
    </MemoryRouter>,
  );

describe('ServingRuntimeTemplatesView', () => {
  it('should render the list view when templates exist', () => {
    renderView([mockServingRuntimeTemplateK8sResource({})]);

    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    // The empty-state add button is only rendered when the list is empty.
    expect(screen.queryByTestId('add-serving-runtime-button')).not.toBeInTheDocument();
  });

  it('should render the empty state (with its add action) instead of the list when there are no templates', () => {
    renderView([]);

    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-serving-runtime-button')).toBeInTheDocument();
  });

  it('should render the page title in standalone mode (noTitle falsy)', () => {
    renderView([mockServingRuntimeTemplateK8sResource({})], false);

    expect(screen.getByRole('heading', { name: 'Serving runtime templates' })).toBeInTheDocument();
  });

  it('should suppress the page title in tab mode (noTitle true)', () => {
    renderView([mockServingRuntimeTemplateK8sResource({})], true);

    expect(
      screen.queryByRole('heading', { name: 'Serving runtime templates' }),
    ).not.toBeInTheDocument();
  });
});
