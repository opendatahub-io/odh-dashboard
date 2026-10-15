import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { useWatchConnectionTypes } from '@odh-dashboard/plugin-core/host-api';
import { HardwareProfilesContext } from '@odh-dashboard/ui-core/context/HardwareProfilesContext';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import RhaiiAppProvider from '../RhaiiAppProvider';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  ...jest.requireActual('@openshift/dynamic-plugin-sdk-utils'),
  useK8sWatchResource: jest.fn(),
}));

const mockUseK8sWatchResource = jest.mocked(useK8sWatchResource);

jest.mock('../ProjectsContextProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const ORIGINAL_TILT_FIXTURES = process.env.RHAII_TILT_FIXTURES;

const ConnectionTypesConsumer: React.FC = () => {
  const [connectionTypes] = useWatchConnectionTypes();
  const {
    globalHardwareProfiles: [profiles],
  } = React.useContext(HardwareProfilesContext);
  return (
    <>
      <span data-testid="connection-type-names">
        {connectionTypes.map((connectionType) => connectionType.metadata.name).join(',')}
      </span>
      <span data-testid="hardware-profile-names">
        {profiles.map((profile) => profile.metadata.name).join(',')}
      </span>
    </>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  const profiles: HardwareProfileKind[] = [
    {
      apiVersion: 'infrastructure.opendatahub.io/v1',
      kind: 'HardwareProfile',
      metadata: { name: 'default-profile', namespace: 'opendatahub' },
      spec: { identifiers: [] },
    },
  ];
  mockUseK8sWatchResource.mockReturnValue([profiles, true, undefined]);
  globalThis.fetch = jest.fn(
    () =>
      new Promise<Response>(() => {
        // Keep the dashboard namespace request pending for this synchronous composition test.
      }),
  );
});

afterEach(() => {
  if (ORIGINAL_TILT_FIXTURES === undefined) {
    delete process.env.RHAII_TILT_FIXTURES;
  } else {
    process.env.RHAII_TILT_FIXTURES = ORIGINAL_TILT_FIXTURES;
  }
  jest.restoreAllMocks();
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe('RhaiiAppProvider Tilt fixture composition', () => {
  it.each([
    ['enabled', 'true', 'uri-v1'],
    ['disabled', 'false', ''],
    ['unset', undefined, ''],
  ] as const)(
    'should expose the expected connection types when fixtures are %s',
    (_state, flag, expected) => {
      if (flag === undefined) {
        delete process.env.RHAII_TILT_FIXTURES;
      } else {
        process.env.RHAII_TILT_FIXTURES = flag;
      }

      render(
        <RhaiiAppProvider>
          <ConnectionTypesConsumer />
        </RhaiiAppProvider>,
      );

      expect(screen.getByTestId('connection-type-names').textContent).toBe(expected);
      expect(screen.getByTestId('hardware-profile-names').textContent).toBe('default-profile');
    },
  );

  it('should watch the dashboard namespace resolved by the BFF', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kube: { namespace: 'redhat-ods-applications' } }),
    });

    render(
      <RhaiiAppProvider>
        <ConnectionTypesConsumer />
      </RhaiiAppProvider>,
    );

    await waitFor(() =>
      expect(mockUseK8sWatchResource).toHaveBeenLastCalledWith(
        expect.objectContaining({ namespace: 'redhat-ods-applications' }),
        expect.objectContaining({ kind: 'HardwareProfile' }),
        undefined,
      ),
    );
  });
});
