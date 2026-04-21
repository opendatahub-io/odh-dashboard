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
import { MaaSSubscription } from '~/app/types/subscriptions';
import PhaseLabel from '~/app/shared/PhaseLabel';

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
          <DescriptionListTerm>Phase</DescriptionListTerm>
          <DescriptionListDescription data-testid="subscription-phase">
            <PhaseLabel phase={subscription.phase} statusMessage={subscription.statusMessage} />
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
