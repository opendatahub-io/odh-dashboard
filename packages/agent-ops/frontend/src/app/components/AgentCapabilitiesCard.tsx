import * as React from 'react';
import { Card, CardBody, CardTitle, Stack, StackItem } from '@patternfly/react-core';
import AgentSkillCard from '~/app/components/AgentSkillCard';
import { AgentCardDetail } from '~/app/types/agentRuntimes';

type AgentCapabilitiesCardProps = {
  agentCard: AgentCardDetail;
};

const AgentCapabilitiesCard: React.FC<AgentCapabilitiesCardProps> = ({ agentCard }) => {
  const skills = agentCard.skills ?? [];

  if (skills.length === 0) {
    return null;
  }

  return (
    <Card data-testid="agent-capabilities-skills">
      <CardTitle>Skills</CardTitle>
      <CardBody>
        <Stack hasGutter data-testid="agent-capabilities-skills-list">
          {skills.map((skill) => (
            <StackItem key={skill.id}>
              <AgentSkillCard skill={skill} />
            </StackItem>
          ))}
        </Stack>
      </CardBody>
    </Card>
  );
};

export default AgentCapabilitiesCard;
