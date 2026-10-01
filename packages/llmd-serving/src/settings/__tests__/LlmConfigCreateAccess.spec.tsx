import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import EmptyTopologyConfigurations from '../topologyConfigs/EmptyTopologyConfigurations';
import EmptyRoutingConfigurations from '../routingConfigs/EmptyRoutingConfigurations';
import LlmAcceleratorConfigEmptyState from '../llmAcceleratorConfigs/LlmAcceleratorConfigEmptyState';
import LlmConfigCreateAccess from '../LlmConfigCreateAccess';

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
      <MemoryRouter>{children}</MemoryRouter>
    </HostApiCoreContext.Provider>
  );
};

describe.each([
  ['topology', EmptyTopologyConfigurations, 'add-topology-config-button'],
  ['routing', EmptyRoutingConfigurations, 'add-routing-config-button'],
  ['accelerator', LlmAcceleratorConfigEmptyState, 'add-accelerator-config-button'],
] as const)('%s creation controls', (_kind, EmptyState, testId) => {
  it('should expose creation only after a namespace-scoped create grant', async () => {
    const reviewAccess = jest.fn().mockResolvedValue(true);
    render(
      <Host reviewAccess={reviewAccess}>
        <EmptyState />
      </Host>,
    );
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expect(reviewAccess).toHaveBeenCalledWith(
      {
        group: 'serving.kserve.io',
        resource: 'llminferenceserviceconfigs',
        verb: 'create',
        namespace: 'operator-ns',
        name: '',
        subresource: '',
      },
      expect.anything(),
    );
  });

  it.each(['denied', 'error'])('should omit creation on %s', async (state) => {
    const reviewAccess = jest.fn().mockImplementation(async () => {
      if (state === 'error') {
        throw new Error('SSAR failed');
      }
      return false;
    });
    render(
      <Host reviewAccess={reviewAccess}>
        <EmptyState />
      </Host>,
    );
    await act(() => Promise.resolve());
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
  });
});

describe('LlmConfigCreateAccess', () => {
  it('should fail closed when the host does not implement strict reviews', () => {
    render(
      <LlmConfigCreateAccess>
        <button type="button">Add configuration</button>
      </LlmConfigCreateAccess>,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
