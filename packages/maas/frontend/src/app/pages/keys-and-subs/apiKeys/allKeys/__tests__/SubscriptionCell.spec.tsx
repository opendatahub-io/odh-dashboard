import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import SubscriptionCell from '~/app/pages/keys-and-subs/apiKeys/allKeys/SubscriptionCell';

describe('SubscriptionCell', () => {
  const originalPathname = window.location.pathname;

  afterEach(() => {
    window.history.replaceState({}, '', originalPathname);
  });

  it('should link to the subscription details in Model Access on the MaaS Portal', () => {
    window.history.replaceState({}, '', '/maas-portal/maas/keys-and-subs/api-keys');

    render(
      <MemoryRouter>
        <SubscriptionCell
          subscriptionName="premium/team"
          subscriptionDetail={{ displayName: 'Premium Team', models: [] }}
          isMaasAdmin
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('subscription-governance-link')).toHaveAttribute(
      'href',
      '/maas/model-access/view/premium%2Fteam',
    );
  });
});
