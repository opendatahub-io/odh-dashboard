import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { MaaSSubscription } from '~/app/types/subscriptions';

type MySubscriptionDetailsProps = {
  subscription: MaaSSubscription;
};

const MySubscriptionDetails: React.FC<MySubscriptionDetailsProps> = ({ subscription }) => (
  <Stack hasGutter data-testid="my-subscription-details-section">
    <StackItem>
      <Title headingLevel="h2" size="xl">
        Subscription details
      </Title>
    </StackItem>
    <StackItem>
      <DescriptionList columnModifier={{ default: '1Col' }} isHorizontal>
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>
            {subscription.displayName?.trim() || subscription.name}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Subscription ID</DescriptionListTerm>
          <DescriptionListDescription>{subscription.name}</DescriptionListDescription>
        </DescriptionListGroup>
        {subscription.description && (
          <DescriptionListGroup>
            <DescriptionListTerm>Description</DescriptionListTerm>
            <DescriptionListDescription>{subscription.description}</DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
    </StackItem>
  </Stack>
);

export default MySubscriptionDetails;
