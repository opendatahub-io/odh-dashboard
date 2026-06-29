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
  Skeleton,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { URL_PREFIX } from '~/app/utilities/const';
import SubscriptionModelsTable from '~/app/pages/keys-and-subs/mySubscriptions/SubscriptionModelsTable';
import { useGetUserSubscription } from '~/app/hooks/useGetUserSubscription';
import MySubscriptionDetails from './MySubscriptionDetails';
import MySubscriptionsApiKeyTable from './MySubscriptionsApiKeyTable';

const ViewSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName?: string }>();
  const [activeTab, setActiveTab] = React.useState<string | number>('details');
  const [subscription, loaded, loadError] = useGetUserSubscription(subscriptionName);
  const displaySubscriptionName = subscription?.display_name?.trim() || subscriptionName;
  const modelRefs = subscription?.model_refs ?? [];

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link
          to={`${URL_PREFIX}/keys-and-subs/subscriptions`}
          data-testid="breadcrumb-my-subscriptions-link"
        >
          API keys
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>
        {loaded ? displaySubscriptionName : <Skeleton width="150px" screenreaderText="Loading" />}
      </BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      title={
        loaded ? displaySubscriptionName : <Skeleton width="250px" screenreaderText="Loading" />
      }
      breadcrumb={breadcrumb}
      empty={loaded && !subscription}
      loaded={loaded}
      loadError={loadError}
      errorMessage="Unable to load subscription details."
      emptyMessage="Subscription not found."
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
                                Models
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
                          <SubscriptionModelsTable models={modelRefs} />
                        </StackItem>
                      </Stack>
                    </CardBody>
                  </Card>
                </StackItem>
                <StackItem>
                  <Card>
                    <CardBody>
                      <MySubscriptionsApiKeyTable subscription={subscription} />
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
