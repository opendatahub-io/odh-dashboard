import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import SubscriptionCell from '~/app/pages/keys-and-subs/apiKeys/allKeys/SubscriptionCell';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';

describe('SubscriptionCell tracking', () => {
  it('should forward the subscription-navigation event to the host-supplied callback once', async () => {
    const trackEvent = jest.fn();
    const user = userEvent.setup();

    render(
      <TrackingProvider trackEvent={trackEvent}>
        <MemoryRouter>
          <SubscriptionCell
            subscriptionName="premium/team"
            subscriptionDetail={{ displayName: 'Premium Team', models: [] }}
            linkable
          />
        </MemoryRouter>
      </TrackingProvider>,
    );

    expect(trackEvent).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('subscription-detail-link'));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('My Subscriptions Detail Navigated', {
      currentView: 'subscription',
      location: 'api_keys_table',
    });
  });
});
