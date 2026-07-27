import * as React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';
import { readSparseRuntimeOverviewFields } from '~/app/utilities/sparseApiFields';

type AgentRuntimeOverviewCardProps = {
  detail: AgentRuntimeDetail;
};

const CopyableValue: React.FC<{ value: string; testId: string }> = ({ value, testId }) => (
  <ClipboardCopy
    variant={ClipboardCopyVariant.inlineCompact}
    isReadOnly
    hoverTip="Copy"
    clickTip="Copied"
    data-testid={testId}
  >
    {value}
  </ClipboardCopy>
);

const AgentRuntimeOverviewCard: React.FC<AgentRuntimeOverviewCardProps> = ({ detail }) => {
  const { displayName, framework, resourceType, workloadStatus, serviceFqdn, endpoints } =
    readSparseRuntimeOverviewFields(detail);

  return (
    <Card data-testid="agent-runtime-overview-card">
      <CardTitle>Runtime overview</CardTitle>
      <CardBody>
        <DescriptionList isCompact>
          {displayName && (
            <DescriptionListGroup>
              <DescriptionListTerm>Display name</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-runtime-display-name">
                {displayName}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {framework && (
            <DescriptionListGroup>
              <DescriptionListTerm>Framework</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-runtime-framework">
                {framework}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {resourceType && (
            <DescriptionListGroup>
              <DescriptionListTerm>Resource type</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-runtime-resource-type">
                {resourceType}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {workloadStatus && (
            <DescriptionListGroup>
              <DescriptionListTerm>Workload status</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-runtime-workload-status">
                {workloadStatus}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {serviceFqdn && (
            <DescriptionListGroup>
              <DescriptionListTerm>Service FQDN</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-runtime-service-fqdn">
                <CopyableValue value={serviceFqdn} testId="agent-runtime-service-fqdn-copy" />
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {endpoints.map((endpoint) => (
            <DescriptionListGroup key={`${endpoint.name}-${endpoint.port}`}>
              <DescriptionListTerm>
                {endpoint.name} ({endpoint.port})
              </DescriptionListTerm>
              <DescriptionListDescription data-testid={`agent-runtime-endpoint-${endpoint.name}`}>
                <CopyableValue
                  value={endpoint.url}
                  testId={`agent-runtime-endpoint-copy-${endpoint.name}`}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default AgentRuntimeOverviewCard;
