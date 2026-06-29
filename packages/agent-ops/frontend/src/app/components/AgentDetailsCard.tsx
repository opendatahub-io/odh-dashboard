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
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import ExternalLink from '@odh-dashboard/internal/components/ExternalLink';
import { AgentCardDetail } from '~/app/types/agentRuntimes';

type AgentDetailsCardProps = {
  agentCard: AgentCardDetail;
};

const firstNonBlank = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => value?.trim());

const getSafeExternalUrl = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
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
  const agentCardUrl = firstNonBlank(agentCard.externalAgentCardUrl, agentCard.agentCardUrl);
  const providerUrl = getSafeExternalUrl(agentCard.provider?.url);
  const documentationUrl = getSafeExternalUrl(agentCard.documentationUrl);
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
                <strong>{agentCard.version}</strong>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {providerLabel && (
            <DescriptionListGroup>
              <DescriptionListTerm>Provider</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-provider">
                {providerUrl ? (
                  <ExternalLink text={providerLabel} to={providerUrl} />
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
          {documentationUrl && (
            <DescriptionListGroup>
              <DescriptionListTerm>Documentation</DescriptionListTerm>
              <DescriptionListDescription data-testid="agent-card-docs">
                <ExternalLink text="View documentation" to={documentationUrl} />
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
