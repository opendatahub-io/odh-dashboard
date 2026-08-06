import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
  Timestamp,
  Title,
} from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MaaSSubscription } from '~/app/types/subscriptions';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseLabelLocation, PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { MaaSEvents } from '~/app/types/event-tracking';

type SubscriptionDetailsSectionProps = {
  subscription: MaaSSubscription;
};

const SubscriptionDetailsSection: React.FC<SubscriptionDetailsSectionProps> = ({
  subscription,
}) => (
  <Stack hasGutter data-testid="subscription-details-section">
    <StackItem>
      <Title headingLevel="h2" size="xl">
        Details
      </Title>
    </StackItem>
    <StackItem>
      <DescriptionList columnModifier={{ default: '2Col' }}>
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>
            {subscription.displayName?.trim() || subscription.name}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Status</DescriptionListTerm>
          <DescriptionListDescription data-testid="subscription-phase">
            <PhaseLabel
              phase={subscription.phase}
              statusMessage={subscription.statusMessage}
              reason={subscription.reason}
              status={subscription.status}
              conditionType={subscription.conditionType}
              lastTransitionTime={subscription.lastTransitionTime}
              resourceType={PhaseResourceType.SUBSCRIPTION}
              resourceName={subscription.displayName ?? subscription.name}
              onClick={() => {
                fireMiscTrackingEvent(MaaSEvents.SUBSCRIPTION_MANAGEMENT_STATUS_POPOVER_VIEWED, {
                  popoverType: 'status',
                  status: subscription.phase,
                  location: PhaseLabelLocation.DETAIL_PAGE,
                });
              }}
            />
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription>{subscription.description ?? '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Resource name</DescriptionListTerm>
          <DescriptionListDescription>{subscription.name}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Created</DescriptionListTerm>
          <DescriptionListDescription>
            {subscription.creationTimestamp ? (
              <Timestamp
                date={new Date(subscription.creationTimestamp)}
                dateFormat="long"
                timeFormat="short"
                is12Hour
              />
            ) : (
              '—'
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </StackItem>
  </Stack>
);

export default SubscriptionDetailsSection;
