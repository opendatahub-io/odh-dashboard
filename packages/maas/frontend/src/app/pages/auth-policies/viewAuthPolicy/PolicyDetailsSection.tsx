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
import { MaaSAuthPolicy, MaaSModelRefSummary } from '~/app/types/subscriptions';
import PhaseLabel from '~/app/shared/Phase/PhaseLabel';
import {
  getAffectedModels,
  PhaseLabelLocation,
  PhaseResourceType,
} from '~/app/utilities/phaseLabelUtils';
import {
  EventTrackingPopoverType,
  MaaSEvents,
  MaaSGovernanceStatusPopoverViewedProperties,
  convertStringToPopoverViewedStatus,
} from '~/app/types/event-tracking';

type PolicyDetailsSectionProps = {
  policy: MaaSAuthPolicy;
  modelRefs: MaaSModelRefSummary[];
};

const PolicyDetailsSection: React.FC<PolicyDetailsSectionProps> = ({ policy, modelRefs }) => (
  <Stack hasGutter data-testid="policy-details-section">
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
            {policy.displayName ?? policy.name}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Status</DescriptionListTerm>
          <DescriptionListDescription data-testid="policy-phase">
            <PhaseLabel
              phase={policy.phase}
              statusMessage={policy.statusMessage}
              reason={policy.reason}
              status={policy.status}
              conditionType={policy.conditionType}
              lastTransitionTime={policy.lastTransitionTime}
              resourceType={PhaseResourceType.AUTHPOLICY}
              resourceName={policy.displayName ?? policy.name}
              affectedModels={getAffectedModels(modelRefs)}
              onClick={() => {
                fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_STATUS_POPOVER_VIEWED, {
                  popoverType: EventTrackingPopoverType.STATUS,
                  status: convertStringToPopoverViewedStatus(policy.phase),
                  location: PhaseLabelLocation.DETAIL_PAGE,
                } satisfies MaaSGovernanceStatusPopoverViewedProperties);
              }}
            />
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
