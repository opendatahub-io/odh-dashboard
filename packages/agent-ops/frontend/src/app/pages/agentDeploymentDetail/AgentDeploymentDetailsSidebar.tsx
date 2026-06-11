import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  Label,
  LabelGroup,
  Title,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import DashboardDescriptionListGroup from '@odh-dashboard/internal/components/DashboardDescriptionListGroup';
import InlineTruncatedClipboardCopy from '@odh-dashboard/internal/components/InlineTruncatedClipboardCopy';
import { AgentCard } from '~/app/types/agentCard';
import { AgentRuntimeDetail } from '~/app/types/agentRuntimes';
import { getAgentCardUrl, getAgentSpiffeId } from './agentDeploymentDetailUtils';

const VISIBLE_LABELS = 5;
const EMPTY_VALUE = '—';
const DEFAULT_AUTHENTICATION = 'Bearer';
const DEFAULT_PROTOCOLS = ['A2A', 'HTTP'];

type AgentDeploymentDetailsSidebarProps = {
  detail: AgentRuntimeDetail;
  agentCard?: AgentCard | null;
};

const ModeLabels: React.FC<{ modes: string[]; testIdPrefix: string }> = ({
  modes,
  testIdPrefix,
}) => (
  <LabelGroup numLabels={VISIBLE_LABELS} isCompact>
    {modes.map((mode) => (
      <Label key={mode} variant="outline" data-testid={`${testIdPrefix}-${mode}`}>
        {mode}
      </Label>
    ))}
  </LabelGroup>
);

const AgentDeploymentDetailsSidebar: React.FC<AgentDeploymentDetailsSidebarProps> = ({
  detail,
  agentCard,
}) => {
  const agentCardUrl = getAgentCardUrl(detail);
  const spiffeId = getAgentSpiffeId(detail);
  const labels = agentCard?.skills.map((skill) => skill.name) ?? [];
  const providerName = agentCard?.provider.displayName || agentCard?.provider.name;
  const providerUrl = agentCard?.provider.url;
  const documentationUrl = providerUrl;
  const hasAgentCardUrl = agentCardUrl !== EMPTY_VALUE;
  const inputModes = agentCard?.supportedInputModes ?? [];
  const outputModes = agentCard?.supportedOutputModes ?? [];

  return (
    <Card data-testid="agent-deployment-details-sidebar">
      <CardHeader>
        <Title headingLevel="h2" size="lg">
          Agent details
        </Title>
      </CardHeader>
      <CardBody>
        <DescriptionList>
          {labels.length > 0 && (
            <DashboardDescriptionListGroup title="Labels">
              <LabelGroup numLabels={VISIBLE_LABELS} isCompact>
                {labels.map((label) => (
                  <Label key={label} variant="outline" data-testid="agent-detail-label">
                    {label}
                  </Label>
                ))}
              </LabelGroup>
            </DashboardDescriptionListGroup>
          )}
          <DashboardDescriptionListGroup
            title="Version"
            isEmpty={!agentCard?.version}
            contentWhenEmpty={EMPTY_VALUE}
            groupTestId="agent-detail-version"
          >
            {agentCard?.version}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Provider"
            isEmpty={!providerName}
            contentWhenEmpty={EMPTY_VALUE}
            groupTestId="agent-detail-provider"
          >
            {providerUrl && providerName ? (
              <Button
                variant="link"
                isInline
                component="a"
                href={providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="agent-detail-provider-link"
              >
                {providerName} <ExternalLinkAltIcon />
              </Button>
            ) : (
              providerName
            )}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Agent card"
            isEmpty={!hasAgentCardUrl}
            contentWhenEmpty={EMPTY_VALUE}
          >
            {hasAgentCardUrl && (
              <InlineTruncatedClipboardCopy
                testId="agent-detail-agent-card-copy"
                textToCopy={agentCardUrl}
                truncatePosition="middle"
              />
            )}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Documentation"
            isEmpty={!documentationUrl}
            contentWhenEmpty={EMPTY_VALUE}
          >
            {documentationUrl ? (
              <Button
                variant="link"
                isInline
                component="a"
                href={documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="agent-detail-documentation-link"
              >
                View documentation <ExternalLinkAltIcon />
              </Button>
            ) : (
              <span data-testid="agent-detail-documentation">{EMPTY_VALUE}</span>
            )}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Default input modes"
            isEmpty={inputModes.length === 0}
            contentWhenEmpty={EMPTY_VALUE}
            groupTestId="agent-detail-input-modes"
          >
            <ModeLabels modes={inputModes} testIdPrefix="agent-detail-input-mode" />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Default output modes"
            isEmpty={outputModes.length === 0}
            contentWhenEmpty={EMPTY_VALUE}
            groupTestId="agent-detail-output-modes"
          >
            <ModeLabels modes={outputModes} testIdPrefix="agent-detail-output-mode" />
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="Authentication"
            groupTestId="agent-detail-authentication"
          >
            <Label variant="outline">{DEFAULT_AUTHENTICATION}</Label>
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="Protocols" groupTestId="agent-detail-protocols">
            <LabelGroup numLabels={VISIBLE_LABELS} isCompact>
              {DEFAULT_PROTOCOLS.map((protocol) => (
                <Label
                  key={protocol}
                  variant="outline"
                  data-testid={`agent-detail-protocol-${protocol}`}
                >
                  {protocol}
                </Label>
              ))}
            </LabelGroup>
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup
            title="UUID"
            isEmpty
            contentWhenEmpty={EMPTY_VALUE}
            groupTestId="agent-detail-uuid"
          >
            {EMPTY_VALUE}
          </DashboardDescriptionListGroup>
          <DashboardDescriptionListGroup title="SPIFFE ID">
            <InlineTruncatedClipboardCopy
              testId="agent-detail-spiffe-copy"
              textToCopy={spiffeId}
              truncatePosition="middle"
            />
          </DashboardDescriptionListGroup>
        </DescriptionList>
      </CardBody>
    </Card>
  );
};

export default AgentDeploymentDetailsSidebar;
