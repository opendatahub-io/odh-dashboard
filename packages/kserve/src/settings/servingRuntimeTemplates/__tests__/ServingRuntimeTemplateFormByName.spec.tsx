import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimeTemplateFormByName } from '../CustomServingRuntimeAddTemplate';
import { CustomServingRuntimeContext } from '../CustomServingRuntimeContext';

jest.mock('@odh-dashboard/internal/concepts/dashboard/codeEditor/DashboardCodeEditor', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard-code-editor" />,
}));

jest.mock('@odh-dashboard/internal/services/templateService', () => ({
  createServingRuntimeTemplateBackend: jest.fn(),
  updateServingRuntimeTemplateBackend: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: () => ({ dashboardNamespace: 'opendatahub' }),
}));

const LIST_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates';

const buildContextValue = (templates: TemplateKind[]) =>
  ({
    refreshData: jest.fn(),
    servingRuntimeTemplates: [templates, true, undefined] as CustomWatchK8sResult<TemplateKind[]>,
    servingRuntimeTemplateOrder: { data: [], loaded: true, error: undefined, refresh: jest.fn() },
    servingRuntimeTemplateDisablement: {
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    },
  } as unknown as React.ContextType<typeof CustomServingRuntimeContext>);

const renderByName = (mode: 'edit' | 'duplicate', name: string, templates: TemplateKind[]) =>
  render(
    <CustomServingRuntimeContext.Provider value={buildContextValue(templates)}>
      <MemoryRouter initialEntries={[`${LIST_PATH}/${mode}/${name}`]}>
        <Routes>
          <Route
            path={`${LIST_PATH}/${mode}/:servingRuntimeName`}
            element={<ServingRuntimeTemplateFormByName mode={mode} />}
          />
        </Routes>
      </MemoryRouter>
    </CustomServingRuntimeContext.Provider>,
  );

describe('ServingRuntimeTemplateFormByName', () => {
  it('should render the edit form for a template resolved by name from context', () => {
    const template = mockServingRuntimeTemplateK8sResource({
      name: 'my-runtime',
      displayName: 'My Runtime',
    });
    renderByName('edit', 'my-runtime', [template]);

    expect(screen.getByText('Edit My Runtime')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-code-editor')).toBeInTheDocument();
  });

  it('should render the duplicate form (titled Duplicate) for a template resolved by name', () => {
    const template = mockServingRuntimeTemplateK8sResource({
      name: 'my-runtime',
      displayName: 'My Runtime',
    });
    renderByName('duplicate', 'my-runtime', [template]);

    // "Duplicate serving runtime" appears in both the page title and the active
    // breadcrumb; assert on the page heading specifically.
    expect(screen.getByRole('heading', { name: 'Duplicate serving runtime' })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-code-editor')).toBeInTheDocument();
  });

  it('should render the not-found empty state when the named template is absent (edit)', () => {
    renderByName('edit', 'missing-runtime', []);

    expect(screen.getByText('Unable to edit serving runtime')).toBeInTheDocument();
    expect(screen.getByText(/missing-runtime/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to the list' })).toHaveAttribute(
      'href',
      LIST_PATH,
    );
  });

  it('should render the not-found empty state when the named template is absent (duplicate)', () => {
    renderByName('duplicate', 'missing-runtime', []);

    expect(screen.getByText('Unable to duplicate serving runtime')).toBeInTheDocument();
  });
});
