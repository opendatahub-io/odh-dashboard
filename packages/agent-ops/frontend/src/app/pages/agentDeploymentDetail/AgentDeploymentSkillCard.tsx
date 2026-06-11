import * as React from 'react';
import { Card, CardBody, Content, Stack, StackItem } from '@patternfly/react-core';
import { AgentSkill } from '~/app/types/agentCard';

type AgentDeploymentSkillCardProps = {
  skill: AgentSkill;
};

const AgentDeploymentSkillCard: React.FC<AgentDeploymentSkillCardProps> = ({ skill }) => (
  <Card isCompact data-testid="agent-skill-card">
    <CardBody>
      <Stack hasGutter>
        <StackItem>
          <Content component="p" className="pf-v6-u-font-weight-bold" data-testid="agent-skill-name">
            {skill.name}
          </Content>
          <Content component="p" className="pf-v6-u-color-200" data-testid="agent-skill-id">
            ID: {skill.id}
          </Content>
        </StackItem>
        <StackItem>
          <Content component="p" data-testid="agent-skill-description">
            {skill.description}
          </Content>
        </StackItem>
      </Stack>
    </CardBody>
  </Card>
);

export default AgentDeploymentSkillCard;
