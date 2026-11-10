import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useVariableDefinitionActions } from '@perses-dev/dashboards';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import PortalClusterDetailsVariablesProvider from '../PortalClusterDetailsVariablesProvider';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({ k8sGetResource: jest.fn() }));
jest.mock('@perses-dev/dashboards', () => ({ useVariableDefinitionActions: jest.fn() }));
// Avoid loading chart dependencies while keeping both the metadata fetch and
// variable adapter implementations real.
jest.mock('@odh-dashboard/observability/dashboard', () => ({
  ...jest.requireActual('../../../../../packages/observability/src/api/useClusterDetails'),
  ...jest.requireActual(
    '../../../../../packages/observability/src/pages/ClusterDetailsVariablesProvider',
  ),
}));

const originalFetch = global.fetch;
const setVariableValue = jest.fn();

describe('PortalClusterDetailsVariablesProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useVariableDefinitionActions).mockReturnValue({
      setVariableValue,
      setVariableLoading: jest.fn(),
      getSavedVariablesStatus: jest.fn(),
      setVariableDefaultValues: jest.fn(),
      setVariableOptions: jest.fn(),
      setVariableDefinitions: jest.fn(),
    });
    jest.mocked(k8sGetResource).mockImplementation(({ queryOptions }) =>
      Promise.resolve(
        queryOptions?.name === 'version'
          ? {
              apiVersion: 'config.openshift.io/v1',
              kind: 'ClusterVersion',
              status: { desired: { version: '4.19.0' } },
            }
          : {
              apiVersion: 'config.openshift.io/v1',
              kind: 'Infrastructure',
              status: {
                apiServerURL: 'https://api.example.test',
                platformStatus: { type: 'AWS' },
              },
            },
      ),
    );
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should wait for subscription metadata before assigning cluster variables', async () => {
    let resolveSubscription: (value: Response) => void = () => undefined;
    global.fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveSubscription = resolve;
        }),
    );
    render(<PortalClusterDetailsVariablesProvider />);
    await waitFor(() => expect(k8sGetResource).toHaveBeenCalledTimes(2));
    expect(setVariableValue).not.toHaveBeenCalled();
    await act(async () => {
      resolveSubscription({ ok: true, json: async () => ({ channel: 'stable' }) } as Response);
    });
    await waitFor(() =>
      expect(setVariableValue).toHaveBeenCalledWith('CLUSTER_DETAILS_CHANNEL', 'stable'),
    );
    expect(setVariableValue).toHaveBeenCalledWith(
      'CLUSTER_DETAILS_API_SERVER',
      'https://api.example.test',
    );
    expect(setVariableValue).toHaveBeenCalledWith('CLUSTER_DETAILS_OPENSHIFT_VERSION', '4.19.0');
    expect(setVariableValue).toHaveBeenCalledWith('CLUSTER_DETAILS_INFRASTRUCTURE_PROVIDER', 'AWS');
    expect(global.fetch).toHaveBeenCalledWith(
      '/maas-portal/api/operator-subscription-status',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should populate fallback variables when cluster metadata is forbidden or unavailable', async () => {
    jest.mocked(k8sGetResource).mockRejectedValue(new Error('Forbidden'));
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    render(<PortalClusterDetailsVariablesProvider />);
    await waitFor(() => expect(setVariableValue).toHaveBeenCalledTimes(4));
    for (const [, value] of setVariableValue.mock.calls) {
      expect(value).toBe('Unknown');
    }
  });

  it.each(['network error', 'HTTP error', 'invalid JSON'])(
    'should preserve cluster metadata when subscription lookup returns %s',
    async (failure) => {
      global.fetch =
        failure === 'network error'
          ? jest.fn().mockRejectedValue(new Error('network unavailable'))
          : jest.fn().mockResolvedValue({
              ok: failure === 'invalid JSON',
              status: 503,
              json: async () => {
                throw new SyntaxError('Unexpected token');
              },
            });
      render(<PortalClusterDetailsVariablesProvider />);
      await waitFor(() => expect(setVariableValue).toHaveBeenCalledTimes(4));
      expect(setVariableValue).toHaveBeenCalledWith('CLUSTER_DETAILS_CHANNEL', 'Unknown');
      expect(setVariableValue).toHaveBeenCalledWith(
        'CLUSTER_DETAILS_API_SERVER',
        'https://api.example.test',
      );
      expect(setVariableValue).toHaveBeenCalledWith('CLUSTER_DETAILS_OPENSHIFT_VERSION', '4.19.0');
      expect(setVariableValue).toHaveBeenCalledWith(
        'CLUSTER_DETAILS_INFRASTRUCTURE_PROVIDER',
        'AWS',
      );
    },
  );
});
