import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApiKeysPageLoad } from '~/app/hooks/useApiKeysPageLoad';
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

  const activeTab = tab && VALID_TABS.includes(tab) ? tab : API_KEYS_TAB;
  const showApiKeysLoadError = activeTab === API_KEYS_TAB && !!apiKeysLoadError;

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, tabKey: string | number) => {
      navigate(`${URL_PREFIX}/keys-and-subs/${String(tabKey)}`);
    },
    [navigate],
  );

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="API keys and subscriptions" objectType={ProjectObjectType.apiKeys} />
      }
      description="Manage your API keys and view your subscription access."
      loaded={activeTab === SUBSCRIPTIONS_TAB || apiKeysPageState.loaded || !!apiKeysLoadError}
      empty={false}
      loadError={showApiKeysLoadError ? apiKeysLoadError : undefined}
      errorMessage="Error loading API keys"
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
          <PageSection isFilled>
            {!showApiKeysLoadError && <ApiKeysTab pageState={apiKeysPageState} />}
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
    </ApplicationsPage>
  );
};

export default ApiKeysAndSubscriptionsPage;
