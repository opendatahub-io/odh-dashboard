import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import {
  createServingRuntimeTemplateBackend,
  updateServingRuntimeTemplateBackend,
} from '@odh-dashboard/internal/services/templateService';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimeTemplateFormByName } from '../CustomServingRuntimeAddTemplate';
import { CustomServingRuntimeContext } from '../CustomServingRuntimeContext';

jest.mock('@odh-dashboard/internal/concepts/dashboard/codeEditor/DashboardCodeEditor', () => ({
  __esModule: true,
  default: ({ code, onCodeChange }: { code: string; onCodeChange: (value: string) => void }) => (
    <textarea
      data-testid="dashboard-code-editor"
      aria-label="ServingRuntime YAML"
      value={code}
      onChange={(event) => onCodeChange(event.target.value)}
    />
  ),
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
  beforeEach(() => {
    jest.clearAllMocks();
  });
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

  it('should keep edit disabled until changed and submit through the update path', async () => {
    const source = mockServingRuntimeTemplateK8sResource({ name: 'edit-runtime' });
    jest.mocked(updateServingRuntimeTemplateBackend).mockResolvedValue(source);
    renderByName('edit', 'edit-runtime', [source]);
    expect(screen.getByTestId('create-button')).toBeDisabled();
    const editor = screen.getByTestId('dashboard-code-editor');
    if (!(editor instanceof HTMLTextAreaElement)) {
      throw new Error('Expected YAML editor to be a textarea');
    }
    fireEvent.change(editor, { target: { value: `${editor.value}\n# edited` } });
    expect(screen.getByTestId('create-button')).toBeEnabled();
    fireEvent.click(screen.getByTestId('create-button'));
    await waitFor(() => expect(updateServingRuntimeTemplateBackend).toHaveBeenCalledTimes(1));
    expect(createServingRuntimeTemplateBackend).not.toHaveBeenCalled();
  });

  it('should keep duplicate prefilled and use the existing create path', async () => {
    const source = mockServingRuntimeTemplateK8sResource({ name: 'copy-runtime' });
    jest.mocked(createServingRuntimeTemplateBackend).mockResolvedValue(source);
    renderByName('duplicate', 'copy-runtime', [source]);
    expect(screen.getByTestId('dashboard-code-editor')).toHaveDisplayValue(/copy-runtime-copy/);
    expect(screen.getByTestId('create-button')).toBeEnabled();
    fireEvent.click(screen.getByTestId('create-button'));
    await waitFor(() => expect(createServingRuntimeTemplateBackend).toHaveBeenCalledTimes(1));
    expect(updateServingRuntimeTemplateBackend).not.toHaveBeenCalled();
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
