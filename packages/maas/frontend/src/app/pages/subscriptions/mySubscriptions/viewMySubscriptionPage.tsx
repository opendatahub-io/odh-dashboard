import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  PageSection,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { useGetSubscriptionInfo } from '~/app/hooks/useGetSubscriptionInfo';
import { URL_PREFIX } from '~/app/utilities/const';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import { buildModelRefSummaries } from '~/app/pages/api-keys/utils';
import MySubscriptionDetails from './mySubscriptionDetails';
import MySubscriptionsApiKeyTable from './mySubscriptionsApiKeyTable';

const ViewSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName: string }>();
  const [activeTab, setActiveTab] = React.useState<string | number>('details');
  const [subscriptionInfo, subscriptionLoaded, subscriptionLoadError] =
    useGetSubscriptionInfo(subscriptionName);
  const displaySubscriptionName =
    subscriptionInfo?.subscription.displayName?.trim() || subscriptionName;
  const modelRefsCount = subscriptionInfo ? buildModelRefSummaries(subscriptionInfo).length : 0;

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link
          to={`${URL_PREFIX}/keys-and-subs/subscriptions`}
          data-testid="breadcrumb-my-subscriptions-link"
        >
          Subscriptions
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>{displaySubscriptionName}</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      title={displaySubscriptionName}
      breadcrumb={breadcrumb}
      empty={false}
      loaded={subscriptionLoaded}
      loadError={subscriptionLoadError}
      errorMessage="Unable to load subscription details."
    >
      {subscriptionLoaded && subscriptionInfo && (
        <Tabs
          activeKey={activeTab}
          onSelect={(_event, key) => setActiveTab(key)}
          aria-label="Subscription detail tabs"
          inset={{ default: 'insetNone' }}
        >
          <Tab
            eventKey="details"
            title={<TabTitleText>Details</TabTitleText>}
            aria-label="Subscription details tab"
            data-testid="subscription-details-tab"
          >
            <PageSection hasBodyWrapper={false}>
              <Stack hasGutter>
                <StackItem>
                  <Card>
                    <CardBody>
                      <MySubscriptionDetails subscription={subscriptionInfo.subscription} />
                    </CardBody>
                  </Card>
                </StackItem>
                <StackItem>
                  <Card>
                    <CardBody>
                      <MaasModelsSection
                        modelRefSummaries={buildModelRefSummaries(subscriptionInfo)}
                        modelRefsWithRateLimits={subscriptionInfo.subscription.modelRefs}
                        resourceType="subscription"
                        title={`Models ${modelRefsCount > 0 ? `(${modelRefsCount})` : ''}`}
                        showProjectColumn={false}
                      />
                    </CardBody>
                  </Card>
                </StackItem>
                <StackItem>
                  <Card>
                    <CardBody>
                      <MySubscriptionsApiKeyTable
                        subscriptionId={subscriptionInfo.subscription.name}
                      />
                    </CardBody>
                  </Card>
                </StackItem>
              </Stack>
            </PageSection>
          </Tab>
        </Tabs>
      )}
    </ApplicationsPage>
  );
};

export default ViewSubscriptionPage;
