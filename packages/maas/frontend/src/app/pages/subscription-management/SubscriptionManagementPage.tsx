import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import EmptyStatePage from './EmptyStatePage';
import OverviewTab from './OverviewTab';
import SubscriptionsTab from './SubscriptionsTab';
import AuthPoliciesTab from './AuthPoliciesTab';

const OVERVIEW_TAB = 'overview';
const SUBSCRIPTIONS_TAB = 'subscriptions';
const AUTH_POLICIES_TAB = 'auth-policies';
const VALID_TABS = [OVERVIEW_TAB, SUBSCRIPTIONS_TAB, AUTH_POLICIES_TAB];

const SubscriptionManagementPage: React.FC = () => {
  const [formData, formDataLoaded] = useSubscriptionPolicyFormData();

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : OVERVIEW_TAB;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      navigate(`${URL_PREFIX}/subscription-management/${String(tabKey)}`);
    },
    [navigate],
  );

  const empty = React.useMemo(
    () =>
      formDataLoaded &&
      formData.policies.length === 0 &&
      formData.subscriptions.length === 0 &&
      formData.modelRefs.length === 0,
    [
      formDataLoaded,
      formData.policies.length,
      formData.subscriptions.length,
      formData.modelRefs.length,
    ],
  );

  return (
    <ApplicationsPage
      title="Subscription management"
      description="Manage subscriptions and authorization policies to control the MaaS models that each user group in your organization can access."
      loaded={formDataLoaded}
      empty={empty}
      emptyStatePage={
        <EmptyStatePage
          returnTo={`${URL_PREFIX}/subscription-management`}
          testId="empty-overview-page"
          title="Get started with subscription management"
          bodyText="No subscriptions or authorization policies have been configured yet. Set up subscriptions to define rate limits and policies to control which groups can access your MaaS models."
          showSubsButton
          showPoliciesButton
          cubeIcon
        />
      }
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
