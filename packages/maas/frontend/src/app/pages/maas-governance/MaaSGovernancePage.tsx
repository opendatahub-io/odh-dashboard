import React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import EmptyStatePage from './EmptyStatePage';
import SubscriptionsTab from './SubscriptionsTab';
import AuthPoliciesTab from './AuthPoliciesTab';
import OverviewTab from './OverviewTab';

export const OVERVIEW_TAB = 'overview';
const SUBSCRIPTIONS_TAB = 'subscriptions';
const AUTH_POLICIES_TAB = 'auth-policies';
const VALID_TABS = [OVERVIEW_TAB, SUBSCRIPTIONS_TAB, AUTH_POLICIES_TAB];

const MaaSGovernancePage: React.FC = () => {
  const { isEmpty, overviewLoaded, overviewError } = useMaaSGovernanceContext();

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : OVERVIEW_TAB;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      navigate(`${URL_PREFIX}/maas-governance/${String(tabKey)}`);
    },
    [navigate],
  );

  return (
    <ApplicationsPage
      title="MaaS governance"
      description="Manage subscriptions and authorization policies that control access to models through the Models-as-a-Service (MaaS) gateway."
      loaded={overviewLoaded || !!overviewError}
      empty={isEmpty}
      loadError={overviewError}
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
        aria-label="MaaS governance tabs"
        inset={{ default: 'insetNone' }}
        mountOnEnter
        unmountOnExit
      >
        <Tab
          eventKey={OVERVIEW_TAB}
          title={<TabTitleText>Overview</TabTitleText>}
          aria-label="Overview tab"
          data-testid="overview-tab"
        >
          {activeTab === OVERVIEW_TAB && <OverviewTab />}
        </Tab>
        <Tab
          eventKey={SUBSCRIPTIONS_TAB}
          title={<TabTitleText>Subscriptions</TabTitleText>}
          aria-label="Subscriptions tab"
          data-testid="subscriptions-tab"
        >
          {activeTab === SUBSCRIPTIONS_TAB && (
            <SubscriptionsTab returnTo={`${URL_PREFIX}/maas-governance/${SUBSCRIPTIONS_TAB}`} />
          )}
        </Tab>
        <Tab
          eventKey={AUTH_POLICIES_TAB}
          title={<TabTitleText>Authorization policies</TabTitleText>}
          aria-label="Authorization policies tab"
          data-testid="auth-policies-tab"
        >
          {activeTab === AUTH_POLICIES_TAB && (
            <AuthPoliciesTab returnTo={`${URL_PREFIX}/maas-governance/${AUTH_POLICIES_TAB}`} />
          )}
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default MaaSGovernancePage;
