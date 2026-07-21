import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
import ApiKeysTab from './apiKeys/ApiKeysTab';
import SubscriptionsTab from './mySubscriptions/SubscriptionsTab';

const API_KEYS_TAB = 'tokens';
const SUBSCRIPTIONS_TAB = 'subscriptions';
const VALID_TABS = [API_KEYS_TAB, SUBSCRIPTIONS_TAB];

const ApiKeysAndSubscriptionsPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : API_KEYS_TAB;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      const selectedTab = String(tabKey);
      if (selectedTab === activeTab) {
        return;
      }
      navigate(`${URL_PREFIX}/keys-and-subs/${selectedTab}`);
    },
    [navigate, activeTab],
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="API keys" objectType={ProjectObjectType.apiKeys} />}
      loaded
      empty={false}
    >
      <Tabs
        activeKey={activeTab}
        onSelect={onSelectTab}
        aria-label="API keys and subscriptions tabs"
        inset={{ default: 'insetNone' }}
        mountOnEnter
        unmountOnExit
      >
        <Tab
          eventKey={API_KEYS_TAB}
          title={<TabTitleText>API keys</TabTitleText>}
          aria-label="API keys tab"
          data-testid="api-keys-tab"
        >
          <ApiKeysTab showDescription />
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
    </ApplicationsPage>
  );
};

export default ApiKeysAndSubscriptionsPage;
