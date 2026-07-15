import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Flex,
  FlexItem,
  Label,
  Truncate,
} from '@patternfly/react-core';
import { TruncatedText } from 'mod-arch-shared';
import { Link, type LinkProps } from 'react-router-dom';
import type { Agent } from '~/app/agentsCatalogTypes';
import { getAgentsCatalogDetailsRoute } from '~/app/routes/agentsCatalog/agentsCatalog';
import AgentsCatalogIcon from '~/app/pages/agentsCatalog/AgentsCatalogIcon';
import { AGENT_FRAMEWORK_LABEL_MAPPING } from '~/app/pages/agentsCatalog/const';

type AgentsCatalogCardProps = {
  agent: Agent;
};

const AgentFallbackIcon: React.FC = () => (
  <span
    className="pf-v6-u-display-inline-block pf-v6-u-font-size-2xl pf-v6-u-color-200"
    aria-hidden
  >
    <AgentsCatalogIcon />
  </span>
);

const AgentsCatalogCard: React.FC<AgentsCatalogCardProps> = React.memo(({ agent }) => {
  const agentId = agent.id;
  const frameworkDisplay = agent.framework
    ? (AGENT_FRAMEWORK_LABEL_MAPPING[agent.framework] ?? agent.framework)
    : undefined;
  const cardLabels = [frameworkDisplay, ...(agent.labels ?? [])].filter(Boolean);
  const [logoFailed, setLogoFailed] = React.useState(false);

  return (
    <Card isFullHeight data-testid={`agent-catalog-card-${agentId}`}>
      <CardHeader>
        <Flex
          alignItems={{ default: 'alignItemsFlexStart' }}
          gap={{ default: 'gapXs' }}
          className="pf-v6-u-mb-md"
        >
          <FlexItem>
            {agent.logo && !logoFailed ? (
              <img
                src={agent.logo}
                alt=""
                style={{ height: '32px', width: '32px' }}
                data-testid={`agent-catalog-card-logo-${agentId}`}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <AgentFallbackIcon />
            )}
          </FlexItem>
        </Flex>
        <CardTitle>
          <Button
            data-testid={`agent-catalog-card-detail-link-${agentId}`}
            variant="link"
            isInline
            component={(props: LinkProps) => (
              <Link {...props} to={getAgentsCatalogDetailsRoute(agent.name)} />
            )}
            style={{
              fontSize: 'var(--pf-t--global--font--size--body--default)',
              fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
            }}
          >
            <Truncate
              content={agent.displayName || agent.name}
              position="middle"
              tooltipPosition="top"
              data-testid={`agent-catalog-card-name-${agentId}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <TruncatedText
          content={agent.description ?? ''}
          maxLines={4}
          data-testid={`agent-catalog-card-description-${agentId}`}
        />
        {cardLabels.length > 0 && (
          <Flex gap={{ default: 'gapSm' }} flexWrap={{ default: 'wrap' }} className="pf-v6-u-mt-md">
            {cardLabels.map((label) => (
              <FlexItem key={label}>
                <Label isCompact data-testid={`agent-catalog-card-label-${agentId}`}>
                  {label}
                </Label>
              </FlexItem>
            ))}
          </Flex>
        )}
      </CardBody>
    </Card>
  );
});
AgentsCatalogCard.displayName = 'AgentsCatalogCard';

export default AgentsCatalogCard;
