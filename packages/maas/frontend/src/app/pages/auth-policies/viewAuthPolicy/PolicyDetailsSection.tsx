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
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import PhaseLabel from '~/app/shared/PhaseLabel';

type PolicyDetailsSectionProps = {
  policy: MaaSAuthPolicy;
};

const PolicyDetailsSection: React.FC<PolicyDetailsSectionProps> = ({ policy }) => (
  <Stack hasGutter data-testid="policy-details-section">
    <StackItem>
      <Title headingLevel="h2" size="xl">
        Policy details
      </Title>
    </StackItem>
    <StackItem>
      <DescriptionList columnModifier={{ default: '2Col' }}>
        <DescriptionListGroup>
          <DescriptionListTerm>Name</DescriptionListTerm>
          <DescriptionListDescription>
            {policy.displayName ?? policy.name}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Phase</DescriptionListTerm>
          <DescriptionListDescription data-testid="policy-phase">
            <PhaseLabel phase={policy.phase} statusMessage={policy.statusMessage} />
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Description</DescriptionListTerm>
          <DescriptionListDescription>{policy.description ?? '—'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Resource name</DescriptionListTerm>
          <DescriptionListDescription>{policy.name}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Date created</DescriptionListTerm>
          <DescriptionListDescription>
            {policy.creationTimestamp && !Number.isNaN(Date.parse(policy.creationTimestamp)) ? (
              <Timestamp
                date={new Date(policy.creationTimestamp)}
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

export default PolicyDetailsSection;
