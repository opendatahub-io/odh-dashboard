import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import ApiKeysTab from './ApiKeysTab';
import SubscriptionsTab from './SubscriptionsTab';

const API_KEYS_TAB = 'api-keys';
const SUBSCRIPTIONS_TAB = 'subscriptions';
const VALID_TABS = [API_KEYS_TAB, SUBSCRIPTIONS_TAB];

const AllApiKeysPage: React.FC = () => {
  const dashboardConfigSpec = React.useContext(DashboardConfigContext);
  const isMySubscriptionsEnabled = !!dashboardConfigSpec?.dashboardConfig.mySubscriptions;
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : API_KEYS_TAB;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      navigate(`${URL_PREFIX}/tokens/${String(tabKey)}`);
    },
    [navigate],
  );

  return (
    <ApplicationsPage
      title={isMySubscriptionsEnabled ? 'API keys and subscriptions' : 'API keys'}
      description={
        isMySubscriptionsEnabled
          ? 'Manage your API keys and view your subscription access'
          : 'Manage API keys that can be used to authenticate with model endpoints.'
      }
      loaded
      empty={false}
    >
      {isMySubscriptionsEnabled ? (
        <Tabs
          activeKey={activeTab}
          onSelect={onSelectTab}
          aria-label="API keys and subscriptions tabs"
          inset={{ default: 'insetNone' }}
        >
          <Tab
            eventKey={API_KEYS_TAB}
            title={<TabTitleText>API keys</TabTitleText>}
            aria-label="API keys tab"
            data-testid="api-keys-tab"
          >
            <PageSection isFilled>
              <ApiKeysTab />
            </PageSection>
          </Tab>
          <Tab
            eventKey={SUBSCRIPTIONS_TAB}
            title={<TabTitleText>Subscriptions</TabTitleText>}
            aria-label="Subscriptions tab"
            data-testid="subscriptions-tab"
          >
            <SubscriptionsTab />
          </Tab>
        </Tabs>
      ) : (
        <ApiKeysTab />
      )}
    </ApplicationsPage>
  );
};

export default AllApiKeysPage;
