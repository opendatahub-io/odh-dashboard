import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ApplicationsPage, ProjectObjectType } from '@odh-dashboard/ui-core';
import {
  PageSection,
  Tab,
  TabContent,
  TabContentBody,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
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
      description="Manage API keys used to authenticate with model endpoints. View your subscriptions and the models they give you access to."
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false}>
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
            tabContentId={`${API_KEYS_TAB}-tab-content`}
            data-testid="api-keys-tab"
          />
          <Tab
            eventKey={SUBSCRIPTIONS_TAB}
            title={<TabTitleText>My subscriptions</TabTitleText>}
            aria-label="My subscriptions tab"
            tabContentId={`${SUBSCRIPTIONS_TAB}-tab-content`}
            data-testid="subscriptions-tab"
          />
        </Tabs>
      </PageSection>
      <TabContent
        id={`${API_KEYS_TAB}-tab-content`}
        activeKey={activeTab}
        eventKey={API_KEYS_TAB}
        hidden={activeTab !== API_KEYS_TAB}
        aria-label="API keys"
      >
        <TabContentBody>{activeTab === API_KEYS_TAB && <ApiKeysTab />}</TabContentBody>
      </TabContent>
      <TabContent
        id={`${SUBSCRIPTIONS_TAB}-tab-content`}
        activeKey={activeTab}
        eventKey={SUBSCRIPTIONS_TAB}
        hidden={activeTab !== SUBSCRIPTIONS_TAB}
        aria-label="My subscriptions"
      >
        <TabContentBody>{activeTab === SUBSCRIPTIONS_TAB && <SubscriptionsTab />}</TabContentBody>
      </TabContent>
    </ApplicationsPage>
  );
};

export default ApiKeysAndSubscriptionsPage;
