import * as React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage, TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import SimpleMenuActions from '@odh-dashboard/internal/components/SimpleMenuActions';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useGetSubscriptionInfo } from '~/app/hooks/useGetSubscriptionInfo';
import {
  MaaSModelRefSummary,
  MaaSSubscription,
  SubscriptionInfoResponse,
} from '~/app/types/subscriptions';
import {
  getBackUrl,
  getBreadcrumbLabelFromState,
  getSectionUrl,
  getSubscriptionEditUrl,
} from '~/app/utilities/subscriptionManagementNavigation';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import SubscriptionManagementYamlTab from '~/app/pages/subscription-management/SubscriptionManagementYamlTab';
import { modelRefsToSummaries } from '~/app/utilities/authpolicies';
import {
  EventTrackingResourceType,
  EventTrackingSource,
  EventTrackingEditSource,
  MaaSEvents,
  EventTrackingContext,
} from '~/app/types/event-tracking';
import DeleteSubscriptionModal from './DeleteSubscriptionModal';
import SubscriptionDetailsSection from './viewSubscription/SubscriptionDetailsSection';
import SubscriptionGroupsSection from './viewSubscription/SubscriptionGroupsSection';

type SubscriptionActionsProps = {
  subscription: MaaSSubscription;
  returnTo?: string;
};

const SubscriptionActions: React.FC<SubscriptionActionsProps> = ({ subscription, returnTo }) => {
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const backUrl = returnTo ?? getSectionUrl('subscriptions');
  const navState = {
    state: {
      ...(returnTo ? { returnTo } : {}),
      editSource: EventTrackingEditSource.DETAIL_KEBAB,
    },
  };

  return (
    <>
      <SimpleMenuActions
        testId="subscription-actions-toggle"
        dropdownItems={[
          {
            key: 'edit',
            label: 'Edit',
            onClick: () => navigate(getSubscriptionEditUrl(subscription.name), navState),
            isDisabled: !!subscription.deletionTimestamp,
          },
          { isSpacer: true },
          {
            key: 'delete',
            label: 'Delete',
            onClick: () => setIsDeleteOpen(true),
            isDisabled: !!subscription.deletionTimestamp,
          },
        ]}
      />
      {isDeleteOpen && (
        <DeleteSubscriptionModal
          subscription={subscription}
          onClose={(deleted) => {
            setIsDeleteOpen(false);
            if (deleted) {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.SUBSCRIPTION,
                source: EventTrackingSource.DETAIL_KEBAB,
                resourceStatus: subscription.phase ?? '',
                outcome: TrackingOutcome.submit,
              });
              navigate(backUrl);
            } else {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.SUBSCRIPTION,
                source: EventTrackingSource.DETAIL_KEBAB,
                resourceStatus: subscription.phase ?? '',
                outcome: TrackingOutcome.cancel,
              });
            }
          }}
        />
      )}
    </>
  );
};

const viewModelRefSummaries = (info: SubscriptionInfoResponse): MaaSModelRefSummary[] =>
  modelRefsToSummaries(
    Array.isArray(info.subscription.modelRefs) ? info.subscription.modelRefs : [],
    Array.isArray(info.modelRefs) ? info.modelRefs : [],
  );

const ViewSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName: string }>();
  const location = useLocation();
  const [activeTab, setActiveTab] = React.useState<string | number>('details');
  const [subscriptionInfo, loaded, loadError] = useGetSubscriptionInfo(subscriptionName);
  const displaySubscriptionName =
    subscriptionInfo?.subscription.displayName?.trim() || subscriptionName;

  const backUrl = getBackUrl(location.state, 'subscriptions');
  const breadcrumbLabel = getBreadcrumbLabelFromState(location.state) ?? 'Subscriptions';

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={backUrl} data-testid="breadcrumb-subscriptions-link">
          {breadcrumbLabel}
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
        subscriptionInfo && (
          <SubscriptionActions subscription={subscriptionInfo.subscription} returnTo={backUrl} />
        )
      }
      empty={false}
      loaded={loaded || !!loadError}
      loadError={loadError}
      errorMessage="Unable to load subscription details."
    >
      {loaded && subscriptionInfo && (
        <Tabs
          activeKey={activeTab}
          aria-label="Subscription detail tabs"
          inset={{ default: 'insetNone' }}
          onSelect={(_event, key) => {
            setActiveTab(key);
            if (key === 'yaml') {
              fireMiscTrackingEvent(MaaSEvents.SUBSCRIPTION_MANAGEMENT_YAML_VIEWED, {
                resourceType: EventTrackingResourceType.SUBSCRIPTION,
                context: EventTrackingContext.DETAILS,
              });
            }
          }}
        >
          <Tab
            eventKey="details"
            title={<TabTitleText>Details</TabTitleText>}
            aria-label="Subscription details tab"
            data-testid="subscription-details-tab"
          >
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <SubscriptionDetailsSection
                subscription={subscriptionInfo.subscription}
                modelRefs={viewModelRefSummaries(subscriptionInfo)}
              />
            </PageSection>
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <SubscriptionGroupsSection groups={subscriptionInfo.subscription.owner.groups} />
            </PageSection>
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <MaasModelsSection
                modelRefSummaries={viewModelRefSummaries(subscriptionInfo)}
                modelRefsWithRateLimits={subscriptionInfo.subscription.modelRefs}
                resourceType="subscription"
              />
            </PageSection>
          </Tab>
          <Tab
            eventKey="yaml"
            title={<TabTitleText>YAML</TabTitleText>}
            aria-label="YAML tab"
            data-testid="subscription-yaml-tab"
          >
            <SubscriptionManagementYamlTab
              resourceName={subscriptionName}
              resourceType="subscription"
            />
          </Tab>
        </Tabs>
      )}
    </ApplicationsPage>
  );
};

export default ViewSubscriptionPage;
