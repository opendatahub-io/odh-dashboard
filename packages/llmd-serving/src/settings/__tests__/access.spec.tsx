import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';
import TopologyConfigurationRow from '../topologyConfigs/TopologyConfigurationRow';
import RoutingConfigurationRow from '../routingConfigs/RoutingConfigurationRow';
import LlmAcceleratorConfigTableRow from '../llmAcceleratorConfigs/LlmAcceleratorConfigTableRow';

jest.mock('@odh-dashboard/ui-core/components/NotFound', () => ({
  __esModule: true,
  default: () => <div data-testid="not-found-page">Not found</div>,
}));

jest.mock('@odh-dashboard/internal/utilities/useNotification', () => ({
  __esModule: true,
  default: () => ({ error: jest.fn(), success: jest.fn(), info: jest.fn() }),
}));

type ReviewAccess = NonNullable<HostApiCoreServices['reviewAccess']>;

const Host: React.FC<React.PropsWithChildren<{ reviewAccess: ReviewAccess }>> = ({
  reviewAccess,
  children,
}) => {
  const defaults = React.useContext(HostApiCoreContext);
  const value = React.useMemo(
    () => ({ ...defaults, dashboardNamespace: 'operator-ns', reviewAccess }),
    [defaults, reviewAccess],
  );
  return (
    <HostApiCoreContext.Provider value={value}>
      <MemoryRouter initialEntries={['/edit/config-a']}>{children}</MemoryRouter>
    </HostApiCoreContext.Provider>
  );
};

describe('configuration access gate', () => {
  const renderGate = (
    reviewAccess: ReviewAccess,
    editVerb: 'patch' | 'update' = 'patch',
    mode: 'view' | 'create' | 'edit' | 'duplicate' = 'edit',
  ) =>
    render(
      <Host reviewAccess={reviewAccess}>
        <Routes>
          <Route
            path="/edit/:configName"
            element={
              <LlmInferenceServiceConfigAccessGate editVerb={editVerb} mode={mode}>
                Authorized editor
              </LlmInferenceServiceConfigAccessGate>
            }
          />
        </Routes>
      </Host>,
    );

  it.each(['denied', 'error'])(
    'should settle %s without showing the editor or leaving a spinner',
    async (state) => {
      renderGate(async () => {
        if (state === 'error') {
          throw new Error('SSAR unavailable');
        }
        return false;
      });
      expect(await screen.findByTestId('not-found-page')).toBeInTheDocument();
      expect(screen.queryByText('Authorized editor')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    },
  );

  it.each(['patch', 'update'] as const)(
    'should review the operator namespace and named %s operation',
    async (editVerb) => {
      const reviewAccess = jest.fn().mockResolvedValue(true);
      renderGate(reviewAccess, editVerb);
      expect(await screen.findByText('Authorized editor')).toBeInTheDocument();
      expect(reviewAccess).toHaveBeenCalledWith(
        {
          group: 'serving.kserve.io',
          resource: 'llminferenceserviceconfigs',
          subresource: '',
          verb: editVerb,
          namespace: 'operator-ns',
          name: 'config-a',
        },
        expect.anything(),
      );
    },
  );

  it.each([
    ['view', 'patch', ['list', 'watch']],
    ['create', 'patch', ['list', 'watch', 'create']],
    ['duplicate', 'patch', ['list', 'watch', 'get', 'create']],
    ['edit', 'patch', ['list', 'watch', 'get', 'patch']],
    ['edit', 'update', ['list', 'watch', 'get', 'update']],
  ] as const)(
    'should allow a minimally authorized %s route (%s)',
    async (mode, editVerb, verbs) => {
      const allowed: readonly string[] = verbs;
      const reviewAccess = jest.fn<ReturnType<ReviewAccess>, Parameters<ReviewAccess>>(
        async ({ verb }) => allowed.includes(verb),
      );
      renderGate(reviewAccess, editVerb, mode);
      expect(await screen.findByText('Authorized editor')).toBeInTheDocument();
      expect(reviewAccess.mock.calls.map(([attrs]) => attrs.verb).toSorted()).toEqual(
        verbs.toSorted(),
      );
      for (const [attrs] of reviewAccess.mock.calls) {
        expect(attrs.name).toBe(['get', 'patch', 'update'].includes(attrs.verb) ? 'config-a' : '');
        expect(attrs.namespace).toBe('operator-ns');
      }
    },
  );

  it.each(['list', 'watch', 'get', 'patch'])(
    'should deny editing without required %s access',
    async (deniedVerb) => {
      renderGate(async ({ verb }) => verb !== deniedVerb);
      expect(await screen.findByTestId('not-found-page')).toBeInTheDocument();
      expect(screen.queryByText('Authorized editor')).not.toBeInTheDocument();
    },
  );
});

describe.each(['topology', 'routing', 'accelerator'] as const)(
  '%s configuration actions',
  (kind) => {
    const renderRow = (reviewAccess: ReviewAccess) => {
      const config = mockLLMInferenceServiceConfigK8sResource({
        name: 'config-a',
        namespace: 'operator-ns',
      });
      return render(
        <Host reviewAccess={reviewAccess}>
          <table>
            <tbody>
              {kind === 'accelerator' ? (
                <LlmAcceleratorConfigTableRow
                  obj={config}
                  rowIndex={0}
                  onDeleteConfig={jest.fn()}
                />
              ) : kind === 'topology' ? (
                <TopologyConfigurationRow
                  config={config}
                  isToggling={false}
                  onDelete={jest.fn()}
                  onToggleEnabled={jest.fn()}
                />
              ) : (
                <RoutingConfigurationRow
                  config={config}
                  isToggling={false}
                  onDelete={jest.fn()}
                  onToggleEnabled={jest.fn()}
                />
              )}
            </tbody>
          </table>
        </Host>,
      );
    };

    it.each(['denied', 'error'])(
      'should omit unauthorized actions and disable toggles on %s',
      async (state) => {
        const reviewAccess = jest.fn().mockImplementation(async () => {
          if (state === 'error') {
            throw new Error('SSAR unavailable');
          }
          return false;
        });
        renderRow(reviewAccess);
        expect(screen.getByRole('switch')).toBeDisabled();
        await act(() => Promise.resolve());
        expect(reviewAccess).toHaveBeenCalled();
        expect(screen.getByRole('switch')).toBeDisabled();
        expect(screen.queryByRole('button', { name: /kebab toggle/i })).not.toBeInTheDocument();
      },
    );

    it('should show only allowed actions using the exact resource name and namespace', async () => {
      const reviewAccess = jest
        .fn()
        .mockImplementation(async ({ verb }) => verb === 'get' || verb === 'create');
      renderRow(reviewAccess);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /kebab toggle/i })).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByRole('button', { name: /kebab toggle/i }));
      expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeDisabled();
      expect(reviewAccess).toHaveBeenCalledWith(
        {
          group: 'serving.kserve.io',
          resource: 'llminferenceserviceconfigs',
          subresource: '',
          verb: 'delete',
          namespace: 'operator-ns',
          name: 'config-a',
        },
        expect.anything(),
      );
      expect(reviewAccess).toHaveBeenCalledWith(
        {
          group: 'serving.kserve.io',
          resource: 'llminferenceserviceconfigs',
          subresource: '',
          verb: 'create',
          namespace: 'operator-ns',
          name: '',
        },
        expect.anything(),
      );
    });
  },
);
