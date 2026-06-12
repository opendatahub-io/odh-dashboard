import * as React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Content,
  Label,
  LabelGroup,
  Skeleton,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { AgentCard } from '~/app/types/agentCard';
import {
  getAgentOptionalCapabilityTestId,
  getEnabledOptionalCapabilities,
} from './agentDeploymentDetailUtils';
import AgentDeploymentSkillCard from './AgentDeploymentSkillCard';

const EMPTY_VALUE = '—';

type AgentDeploymentCapabilitiesCardProps = {
  agentCard?: AgentCard | null;
  loaded?: boolean;
  error?: Error;
};

const AgentDeploymentCapabilitiesCard: React.FC<AgentDeploymentCapabilitiesCardProps> = ({
  agentCard,
  loaded = true,
  error,
}) => {
  const skills = agentCard?.skills ?? [];
  const optionalCapabilities = getEnabledOptionalCapabilities(agentCard?.capabilities);

  const renderBody = () => {
    if (!loaded) {
      return <Skeleton height="8rem" data-testid="agent-capabilities-loading" />;
    }

    if (error) {
      return (
        <Content component="p" data-testid="agent-capabilities-error">
          {error.message}
        </Content>
      );
    }

    return (
      <Stack hasGutter>
        <StackItem>
          <Content
            component="p"
            className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm"
            data-testid="agent-capabilities-skills-heading"
          >
            Skills
          </Content>
          {skills.length === 0 ? (
            <Content component="p" data-testid="agent-capabilities-no-skills">
              No skills
            </Content>
          ) : (
            <Stack hasGutter>
              {skills.map((skill) => (
                <StackItem key={skill.id}>
                  <AgentDeploymentSkillCard skill={skill} />
                </StackItem>
              ))}
            </Stack>
          )}
        </StackItem>
        <StackItem>
          <Content
            component="p"
            className="pf-v6-u-font-weight-bold pf-v6-u-mb-sm"
            data-testid="agent-capabilities-optional-heading"
          >
            Optional capabilities
          </Content>
          {optionalCapabilities.length > 0 ? (
            <LabelGroup numLabels={5} isCompact data-testid="agent-optional-capabilities-group">
              {optionalCapabilities.map((capability) => (
                <Label
                  key={capability}
                  variant="outline"
                  data-testid={getAgentOptionalCapabilityTestId(capability)}
                >
                  {capability}
                </Label>
              ))}
            </LabelGroup>
          ) : (
            <Content component="p" data-testid="agent-capabilities-none">
              {EMPTY_VALUE}
            </Content>
          )}
        </StackItem>
      </Stack>
    );
  };

  return (
    <Card data-testid="agent-deployment-capabilities-card">
      <CardHeader>
        <Title headingLevel="h2" size="lg">
          Capabilities
        </Title>
      </CardHeader>
      <CardBody>{renderBody()}</CardBody>
    </Card>
  );
};

export default AgentDeploymentCapabilitiesCard;
