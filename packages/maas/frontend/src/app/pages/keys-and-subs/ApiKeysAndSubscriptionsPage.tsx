import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApiKeysPageLoad } from '~/app/hooks/useApiKeysPageLoad';
import { useUserSubscriptions } from '~/app/hooks/useUserSubscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import ApiKeysTab from './apiKeys/ApiKeysTab';
import SubscriptionsTab from './mySubscriptions/SubscriptionsTab';

const API_KEYS_TAB = 'tokens';
const SUBSCRIPTIONS_TAB = 'subscriptions';
const VALID_TABS = [API_KEYS_TAB, SUBSCRIPTIONS_TAB];

const ApiKeysAndSubscriptionsPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const apiKeysPageState = useApiKeysPageLoad();
  const { loadError: apiKeysLoadError } = apiKeysPageState;
  const [subscriptions, subscriptionsLoaded, subscriptionsLoadError] = useUserSubscriptions();

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : API_KEYS_TAB;

  // API keys tab needs both fetches to resolve before the page is considered loaded.
  // Subscriptions tab only needs the subscriptions fetch.
  const apiKeysTabReady =
    (apiKeysPageState.loaded || !!apiKeysLoadError) &&
    (subscriptionsLoaded || !!subscriptionsLoadError);
  const subscriptionsTabReady = subscriptionsLoaded || !!subscriptionsLoadError;
  const isPageLoaded = activeTab === SUBSCRIPTIONS_TAB ? subscriptionsTabReady : apiKeysTabReady;

  const apiKeysTabError = apiKeysLoadError ?? subscriptionsLoadError;
  const showApiKeysLoadError = activeTab === API_KEYS_TAB && !!apiKeysTabError;
  const pageLoadError = activeTab === API_KEYS_TAB ? apiKeysTabError : subscriptionsLoadError;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      navigate(`${URL_PREFIX}/keys-and-subs/${String(tabKey)}`);
    },
    [navigate],
  );

  return (
    <ApplicationsPage
      title={<TitleWithIcon title="API keys" objectType={ProjectObjectType.apiKeys} />}
      loaded={isPageLoaded}
      empty={false}
      loadError={pageLoadError}
      errorMessage={
        activeTab === SUBSCRIPTIONS_TAB ? 'Error loading subscriptions' : 'Error loading API keys'
      }
    >
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
          {!showApiKeysLoadError && (
            <ApiKeysTab
              pageState={apiKeysPageState}
              subscriptions={subscriptions}
              showDescription
            />
          )}
        </Tab>
        <Tab
          eventKey={SUBSCRIPTIONS_TAB}
          title={<TabTitleText>Subscriptions</TabTitleText>}
          aria-label="Subscriptions tab"
          data-testid="subscriptions-tab"
        >
          <SubscriptionsTab subscriptions={subscriptions} />
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default ApiKeysAndSubscriptionsPage;
