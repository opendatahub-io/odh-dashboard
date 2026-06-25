import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import OverviewTab from './OverviewTab';
import SubscriptionsTab from './SubscriptionsTab';
import AuthPoliciesTab from './AuthPoliciesTab';

const OVERVIEW_TAB = 'overview';
const SUBSCRIPTIONS_TAB = 'subscriptions';
const AUTH_POLICIES_TAB = 'auth-policies';
const VALID_TABS = [OVERVIEW_TAB, SUBSCRIPTIONS_TAB, AUTH_POLICIES_TAB];

const SubscriptionManagementPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : OVERVIEW_TAB;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      navigate(`${URL_PREFIX}/subscription-management/${String(tabKey)}`);
    },
    [navigate],
  );

  return (
    <ApplicationsPage
      title="Subscription management"
      description="Manage subscriptions and authorization policies to control the MaaS models that each user group in your organization can access."
      loaded
      empty={false}
    >
      <Tabs
        activeKey={activeTab}
        onSelect={onSelectTab}
        aria-label="Subscription management tabs"
        inset={{ default: 'insetNone' }}
      >
        <Tab
          eventKey={OVERVIEW_TAB}
          title={<TabTitleText>Overview</TabTitleText>}
          aria-label="Overview tab"
          data-testid="overview-tab"
        >
          <OverviewTab />
        </Tab>
        <Tab
          eventKey={SUBSCRIPTIONS_TAB}
          title={<TabTitleText>Subscriptions</TabTitleText>}
          aria-label="Subscriptions tab"
          data-testid="subscriptions-tab"
        >
          <SubscriptionsTab
            returnTo={`${URL_PREFIX}/subscription-management/${SUBSCRIPTIONS_TAB}`}
          />
        </Tab>
        <Tab
          eventKey={AUTH_POLICIES_TAB}
          title={<TabTitleText>Authorization policies</TabTitleText>}
          aria-label="Authorization policies tab"
          data-testid="auth-policies-tab"
        >
          <AuthPoliciesTab
            returnTo={`${URL_PREFIX}/subscription-management/${AUTH_POLICIES_TAB}`}
          />
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default SubscriptionManagementPage;
