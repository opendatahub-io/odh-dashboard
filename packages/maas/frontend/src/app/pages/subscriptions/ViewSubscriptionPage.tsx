import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import SimpleMenuActions from '@odh-dashboard/internal/components/SimpleMenuActions';
import { useGetSubscriptionInfo } from '~/app/hooks/useGetSubscriptionInfo';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import DeleteSubscriptionModal from './DeleteSubscriptionModal';
import SubscriptionDetailsSection from './viewSubscription/SubscriptionDetailsSection';
import SubscriptionGroupsSection from './viewSubscription/SubscriptionGroupsSection';

type SubscriptionActionsProps = {
  subscription: MaaSSubscription;
};

const SubscriptionActions: React.FC<SubscriptionActionsProps> = ({ subscription }) => {
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  return (
    <>
      <SimpleMenuActions
        testId="subscription-actions-toggle"
        dropdownItems={[
          {
            key: 'edit',
            label: 'Edit subscription',
            onClick: () => navigate(`${URL_PREFIX}/subscriptions/edit/${subscription.name}`),
          },
          { isSpacer: true },
          {
            key: 'delete',
            label: 'Delete subscription',
            onClick: () => setIsDeleteOpen(true),
          },
        ]}
      />
      {isDeleteOpen && (
        <DeleteSubscriptionModal
          subscription={subscription}
          onClose={(deleted) => {
            setIsDeleteOpen(false);
            if (deleted) {
              navigate(`${URL_PREFIX}/subscriptions`);
            }
          }}
        />
      )}
    </>
  );
};

const ViewSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName: string }>();
  const [activeTab, setActiveTab] = React.useState<string | number>('details');
  const [subscriptionInfo, loaded, loadError] = useGetSubscriptionInfo(subscriptionName);
  const displaySubscriptionName =
    subscriptionInfo?.subscription.displayName?.trim() || subscriptionName;

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={`${URL_PREFIX}/subscriptions`} data-testid="breadcrumb-subscriptions-link">
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
      headerAction={
        subscriptionInfo && <SubscriptionActions subscription={subscriptionInfo.subscription} />
      }
      empty={false}
      loaded={loaded}
      loadError={loadError}
      errorMessage="Unable to load subscription details."
    >
      {loaded && subscriptionInfo && (
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
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <SubscriptionDetailsSection subscription={subscriptionInfo.subscription} />
            </PageSection>
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <SubscriptionGroupsSection groups={subscriptionInfo.subscription.owner.groups} />
            </PageSection>
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <MaasModelsSection
                modelRefSummaries={subscriptionInfo.modelRefs}
                modelRefsWithRateLimits={subscriptionInfo.subscription.modelRefs}
              />
            </PageSection>
          </Tab>
        </Tabs>
      )}
    </ApplicationsPage>
  );
};

export default ViewSubscriptionPage;
