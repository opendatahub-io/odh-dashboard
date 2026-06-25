import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { AgentCardDetail } from '~/app/types/agentRuntimes';

type AgentDetailsCardProps = {
  agentCard: AgentCardDetail;
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

const AgentDetailsCard: React.FC<AgentDetailsCardProps> = ({ agentCard }) => {
  const agentCardUrl = agentCard.externalAgentCardUrl ?? agentCard.agentCardUrl;
  const { defaultInputModes } = agentCard;
  const { defaultOutputModes } = agentCard;
  const providerLabel = agentCard.provider?.organization ?? agentCard.provider?.url;

  return (
    <Card data-testid="agent-card-details">
      <CardTitle>Agent details</CardTitle>
      <CardBody>
        <DescriptionList isCompact>
          {agentCard.labels && agentCard.labels.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Labels</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-labels">
                <LabelGroup>
                  {agentCard.labels.map((label) => (
                    <Label key={label} isCompact variant="outline">
                      {label}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {agentCard.version && (
            <DescriptionListGroup>
              <DescriptionListTerm>Version</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-version">
                {agentCard.version}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {providerLabel && (
            <DescriptionListGroup>
              <DescriptionListTerm>Provider</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-provider">
                {agentCard.provider?.url ? (
                  <Button
                    variant="link"
                    isInline
                    icon={<ExternalLinkAltIcon />}
                    iconPosition="end"
                    onClick={() => {
                      window.open(agentCard.provider?.url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    {providerLabel}
                  </Button>
                ) : (
                  providerLabel
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {agentCardUrl && (
            <DescriptionListGroup>
              <DescriptionListTerm>AgentCard</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-url">
                <CopyableValue value={agentCardUrl} testId="agent-card-url-copy" />
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {agentCard.documentationUrl && (
            <DescriptionListGroup>
              <DescriptionListTerm>Documentation</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-docs">
                <Button
                  variant="link"
                  isInline
                  icon={<ExternalLinkAltIcon />}
                  iconPosition="end"
                  onClick={() => {
                    window.open(agentCard.documentationUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  View documentation
                </Button>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {defaultInputModes.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Default input modes</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-input-modes">
                <LabelGroup>
                  {defaultInputModes.map((mode) => (
                    <Label key={mode} isCompact variant="outline">
                      {mode}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {defaultOutputModes.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Default output modes</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-output-modes">
                <LabelGroup>
                  {defaultOutputModes.map((mode) => (
                    <Label key={mode} isCompact variant="outline">
                      {mode}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {agentCard.authenticationMethods && agentCard.authenticationMethods.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Authentication</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-auth">
                <LabelGroup>
                  {agentCard.authenticationMethods.map((method) => (
                    <Label key={method} isCompact variant="outline">
                      {method}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {agentCard.protocols && agentCard.protocols.length > 0 && (
            <DescriptionListGroup>
              <DescriptionListTerm>Protocols</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-protocols">
                <LabelGroup>
                  {agentCard.protocols.map((protocol) => (
                    <Label key={protocol} isCompact variant="outline">
                      {protocol}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {agentCard.uuid && (
            <DescriptionListGroup>
              <DescriptionListTerm>UUID</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-uuid">
                <CopyableValue value={agentCard.uuid} testId="agent-card-uuid-copy" />
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {agentCard.spiffeId && (
            <DescriptionListGroup>
              <DescriptionListTerm>SPIFFE ID</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-spiffe-id">
                <CopyableValue value={agentCard.spiffeId} testId="agent-card-spiffe-id-copy" />
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default AgentDetailsCard;
