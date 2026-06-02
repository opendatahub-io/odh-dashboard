import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  PageSection,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { URL_PREFIX } from '~/app/utilities/const';
import ModelsViewTable from '~/app/pages/api-keys/ModelsViewTable';
import { deriveModelGroups, sortModelGroups } from '~/app/pages/api-keys/SubscriptionsTab';
import { useUserSubscriptions } from '~/app/hooks/useUserSubscriptions';
import MySubscriptionDetails from './mySubscriptionDetails';
import MySubscriptionsApiKeyTable from './mySubscriptionsApiKeyTable';

const ViewSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName: string }>();
  const [activeTab, setActiveTab] = React.useState<string | number>('details');
  const [modelSortDirection, setModelSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    undefined,
  );
  const [subscriptions, loaded, loadError] = useUserSubscriptions();
  const subscription = subscriptions.find((sub) => sub.subscription_id_header === subscriptionName);
  const displaySubscriptionName = subscription?.display_name?.trim() || subscriptionName;
  const modelGroups = React.useMemo(
    () => (subscription ? deriveModelGroups([subscription]) : []),
    [subscription],
  );
  const sortedModelGroups = React.useMemo(
    () => sortModelGroups(modelGroups, modelSortDirection),
    [modelGroups, modelSortDirection],
  );
  const modelRefsCount = modelGroups.length;

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
      loaded={loaded}
      loadError={loadError}
      errorMessage="Unable to load subscription details."
    >
      {loaded && subscription && (
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
                      <MySubscriptionDetails subscription={subscription} />
                    </CardBody>
                  </Card>
                </StackItem>
                <StackItem>
                  <Card>
                    <CardBody>
                      <Stack hasGutter data-testid="subscription-models-section">
                        <StackItem>
                          <Flex
                            direction={{ default: 'column' }}
                            spaceItems={{ default: 'spaceItemsSm' }}
                          >
                            <FlexItem>
                              <Title headingLevel="h2" size="xl">
                                {`Models ${modelRefsCount > 0 ? `(${modelRefsCount})` : ''}`}
                              </Title>
                            </FlexItem>
                            <FlexItem>
                              <Content component="p">
                                Models available to members of this subscription.
                              </Content>
                            </FlexItem>
                          </Flex>
                        </StackItem>
                        <StackItem>
                          <ModelsViewTable
                            modelGroups={modelGroups}
                            filteredModelGroups={sortedModelGroups}
                            modelSortDirection={modelSortDirection}
                            onModelSortDirectionChange={setModelSortDirection}
                            isCompactVersion
                          />
                        </StackItem>
                      </Stack>
                    </CardBody>
                  </Card>
                </StackItem>
                <StackItem>
                  <Card>
                    <CardBody>
                      <MySubscriptionsApiKeyTable
                        subscriptionId={subscription.subscription_id_header}
                        keyCount={subscription.key_count ?? undefined}
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
