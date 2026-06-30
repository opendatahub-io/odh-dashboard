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
import { UserSubscription } from '~/app/types/subscriptions';

type MySubscriptionDetailsProps = {
  subscription: UserSubscription;
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
            {subscription.display_name?.trim() || subscription.subscription_id_header}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>ID</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{subscription.subscription_id_header}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        {subscription.subscription_description && (
          <DescriptionListGroup>
            <DescriptionListTerm>Description</DescriptionListTerm>
            <DescriptionListDescription>
              {subscription.subscription_description}
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
    </StackItem>
  </Stack>
);

export default MySubscriptionDetails;
