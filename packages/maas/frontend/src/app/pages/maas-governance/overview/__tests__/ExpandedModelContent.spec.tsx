import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ExpandedModelContent from '~/app/pages/maas-governance/overview/ExpandedModelContent';
import { ModelSubscriptionRef } from '~/app/types/subscriptions';

jest.mock('~/app/hooks/useGovernanceAffectedModels', () => ({
  useGovernanceResourceAffectedModels: () => ({ affectedModels: [], overviewLoaded: true }),
}));

jest.mock('~/app/shared/Phase/PhaseLabel', () => ({
  __esModule: true,
  default: () => <span data-testid="mock-phase-label" />,
}));

const modelRef = (
  name: string,
  namespace: string,
  displayName?: string,
  tokenRateLimits: ModelSubscriptionRef['tokenRateLimits'] = [{ limit: 100000, window: '24h' }],
): ModelSubscriptionRef => ({ name, namespace, displayName, tokenRateLimits });

describe('ExpandedModelContent', () => {
  it('should disambiguate token-limit labels colliding on display name and namespace with the resource name', () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[
            {
              name: 'team-sub',
              modelRefs: [
                modelRef('granite-small', 'maas-models', 'Granite Shared', [
                  { limit: 100000, window: '24h' },
                ]),
                modelRef('granite-large', 'maas-models', 'Granite Shared', [
                  { limit: 250000, window: '1h' },
                ]),
              ],
            },
          ]}
          policies={[]}
          returnTo="/maas/maas-governance/overview?view=groups"
        />
        ,
      </MemoryRouter>,
    );

    const tokenLimits = screen.getByTestId('expandable-item-token-limits');
    expect(tokenLimits).toHaveTextContent('Granite Shared (maas-models/granite-small)');
    expect(tokenLimits).toHaveTextContent('Granite Shared (maas-models/granite-large)');
    // Each model ref renders its own limits, not a shared value
    expect(tokenLimits).toHaveTextContent('Granite Shared (maas-models/granite-small): 100,000');
    expect(tokenLimits).toHaveTextContent('Granite Shared (maas-models/granite-large): 250,000');
  });

  it('should disambiguate token-limit labels colliding across namespaces with the namespace only', () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[
            {
              name: 'team-sub',
              modelRefs: [
                modelRef('granite-small', 'maas-models', 'Granite Shared'),
                modelRef('granite-small', 'other-project', 'Granite Shared'),
              ],
            },
          ]}
          policies={[]}
          returnTo="/maas/maas-governance/overview?view=groups"
        />
        ,
      </MemoryRouter>,
    );

    const tokenLimits = screen.getByTestId('expandable-item-token-limits');
    expect(tokenLimits).toHaveTextContent('Granite Shared (maas-models)');
    expect(tokenLimits).toHaveTextContent('Granite Shared (other-project)');
  });

  it('should render a plain label for unique token-limit model refs', () => {
    render(
      <MemoryRouter>
        <ExpandedModelContent
          subscriptions={[
            {
              name: 'team-sub',
              modelRefs: [modelRef('granite-small', 'maas-models', 'Granite Small')],
            },
          ]}
          policies={[]}
          returnTo="/maas/maas-governance/overview?view=groups"
        />
        ,
      </MemoryRouter>,
    );

    expect(screen.getByTestId('expandable-item-token-limits')).toHaveTextContent('Granite Small:');
  });
});
