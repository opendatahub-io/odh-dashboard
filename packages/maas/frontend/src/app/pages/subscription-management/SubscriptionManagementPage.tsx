import React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import EmptyStatePage from './EmptyStatePage';
import SubscriptionsTab from './SubscriptionsTab';
import AuthPoliciesTab from './AuthPoliciesTab';

//const OVERVIEW_TAB = 'overview';
const SUBSCRIPTIONS_TAB = 'subscriptions';
const AUTH_POLICIES_TAB = 'auth-policies';
const VALID_TABS = [SUBSCRIPTIONS_TAB, AUTH_POLICIES_TAB];

const SubscriptionManagementPage: React.FC = () => {
  const [formData, formDataLoaded] = useSubscriptionPolicyFormData();

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : SUBSCRIPTIONS_TAB;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      navigate(`${URL_PREFIX}/maas-governance/${String(tabKey)}`);
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
      title="MaaS governance"
      description="Manage subscriptions and authorization policies that control access to models through the Models-as-a-Service (MaaS) gateway."
      loaded={formDataLoaded}
      empty={empty}
      emptyStatePage={
        <EmptyStatePage
          returnTo={`${URL_PREFIX}/maas-governance`}
          testId="empty-overview-page"
          title="Configure MaaS governance"
          bodyText="No subscriptions or authorization policies exist. Create subscriptions to define token limits and authorization policies to control model access."
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
        {/* <Tab
          eventKey={OVERVIEW_TAB}
          title={<TabTitleText>Overview</TabTitleText>}
          aria-label="Overview tab"
          data-testid="overview-tab"
        >
          <OverviewTab />
        </Tab> */}
        <Tab
          eventKey={SUBSCRIPTIONS_TAB}
          title={<TabTitleText>Subscriptions</TabTitleText>}
          aria-label="Subscriptions tab"
          data-testid="subscriptions-tab"
        >
          <SubscriptionsTab returnTo={`${URL_PREFIX}/maas-governance/${SUBSCRIPTIONS_TAB}`} />
        </Tab>
        <Tab
          eventKey={AUTH_POLICIES_TAB}
          title={<TabTitleText>Authorization policies</TabTitleText>}
          aria-label="Authorization policies tab"
          data-testid="auth-policies-tab"
        >
          <AuthPoliciesTab returnTo={`${URL_PREFIX}/maas-governance/${AUTH_POLICIES_TAB}`} />
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default SubscriptionManagementPage;
