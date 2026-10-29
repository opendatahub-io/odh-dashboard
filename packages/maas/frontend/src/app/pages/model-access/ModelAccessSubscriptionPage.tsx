import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { Breadcrumb, BreadcrumbItem, PageSection, Skeleton } from '@patternfly/react-core';
import { useGetUserSubscription } from '~/app/hooks/useGetUserSubscription';
import {
  MaaSModelRefSummary,
  MaaSSubscription,
  ModelSubscriptionRef,
  UserSubscription,
} from '~/app/types/subscriptions';
import SubscriptionDetailsSection from '~/app/pages/subscriptions/viewSubscription/SubscriptionDetailsSection';
import SubscriptionGroupsSection from '~/app/pages/subscriptions/viewSubscription/SubscriptionGroupsSection';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import { modelRefsToSummaries } from '~/app/utilities/authpolicies';
import { MODEL_ACCESS_PATH } from './utils';

/**
 * Maps the maas-api passthrough payload (GET /subscriptions/{id}) onto the
 * MaaSSubscription shape consumed by the shared governance detail sections.
 * Mirrors the BFF's ConvertSubscriptionListItemsToSubscriptions: the passthrough
 * payload has no phase/status fields, so those stay empty — the status field is
 * hidden on this page (see showStatus={false} below).
 */
const toMaaSSubscription = (sub: UserSubscription): MaaSSubscription => ({
  name: sub.subscription_id_header,
  displayName: sub.display_name,
  description: sub.subscription_description,
  namespace: '',
  inferencePriority: sub.inference_priority,
  owner: sub.owner ?? { groups: [] },
  modelRefs: sub.model_refs.map<ModelSubscriptionRef>((ref) => ({
    name: ref.name,
    namespace: ref.namespace ?? '',
    displayName: ref.display_name,
    description: ref.description,
    tokenRateLimits: ref.token_rate_limits ?? [],
  })),
});

/**
 * Read-only subscription overview for the Model Access page.
 *
 * Reuses the MaaS governance subscription detail sections (details, groups,
 * models) fed by the maas-api passthrough (`GET /subscriptions/{id}`), so it
 * works without Kubernetes access. Status fields are omitted: the passthrough
 * payload does not carry them and they do not apply in the MaaS Portal context.
 * Edit/delete actions and the YAML tab are governance-only and are not offered.
 */
const ModelAccessSubscriptionPage: React.FC = () => {
  const { subscriptionName = '' } = useParams<{ subscriptionName: string }>();
  const [subscription, loaded, loadError] = useGetUserSubscription(subscriptionName);

  const displaySubscriptionName = subscription?.display_name?.trim() || subscriptionName;
  const title = loaded ? (
    displaySubscriptionName
  ) : (
    <Skeleton width="250px" screenreaderText="Loading" />
  );

  const maasSubscription = subscription ? toMaaSSubscription(subscription) : undefined;
  const modelRefSummaries: MaaSModelRefSummary[] = maasSubscription
    ? modelRefsToSummaries(maasSubscription.modelRefs, [])
    : [];

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={MODEL_ACCESS_PATH} data-testid="breadcrumb-model-access-link">
          Model Access
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>{displaySubscriptionName}</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={breadcrumb}
      empty={loaded && !subscription}
      loaded={loaded}
      loadError={loadError}
      errorMessage="Unable to load subscription details."
      emptyMessage="Subscription not found."
    >
      {loaded && maasSubscription && (
        <>
          <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
            <SubscriptionDetailsSection
              subscription={maasSubscription}
              modelRefs={modelRefSummaries}
              showStatus={false}
            />
          </PageSection>
          <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
            <SubscriptionGroupsSection groups={maasSubscription.owner.groups} />
          </PageSection>
          <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
            <MaasModelsSection
              modelRefSummaries={modelRefSummaries}
              modelRefsWithRateLimits={maasSubscription.modelRefs}
              hideColumns={['status']}
              resourceType="subscription"
            />
          </PageSection>
        </>
      )}
    </ApplicationsPage>
  );
};

export default ModelAccessSubscriptionPage;
