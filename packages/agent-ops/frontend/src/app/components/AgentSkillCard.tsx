import * as React from 'react';
import {
  Card,
  CardBody,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  List,
  ListItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import MarkdownComponent from '@odh-dashboard/internal/components/markdown/MarkdownComponent';
import { AgentCardSkill } from '~/app/types/agentRuntimes';

type AgentSkillCardProps = {
  skill: AgentCardSkill;
};

const formatModes = (label: string, modes: string[]): string | undefined => {
  if (modes.length === 0) {
    return undefined;
  }
  return `${label}: ${modes.join(', ')}`;
};

const AgentSkillCard: React.FC<AgentSkillCardProps> = ({ skill }) => {
  const inputModes = formatModes('Input', skill.inputModes);
  const outputModes = formatModes('Output', skill.outputModes);
  const modeSummary = [inputModes, outputModes].filter(Boolean).join(' · ');

  return (
    <Card isCompact data-testid={`agent-skill-card-${skill.id}`}>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h3" size="md" data-testid="agent-skill-name">
              {skill.name}
            </Title>
            <Content component={ContentVariants.small} data-testid="agent-skill-id">
              ID: {skill.id}
            </Content>
          </StackItem>
          {skill.description && (
            <StackItem>
              <MarkdownComponent
                data={skill.description}
                dataTestId={`agent-skill-description-${skill.id}`}
                maxHeading={3}
              />
            </StackItem>
          )}
          {skill.tags.length > 0 && (
            <StackItem>
              <LabelGroup data-testid="agent-skill-tags">
                {skill.tags.map((tag) => (
                  <Label key={tag} isCompact variant="outline">
                    {tag}
                  </Label>
                ))}
              </LabelGroup>
            </StackItem>
          )}
          {skill.examples.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Content component={ContentVariants.small}>Examples</Content>
                </StackItem>
                <StackItem>
                  <Flex>
                    <FlexItem spacer={{ default: 'spacerMd' }} />
                    <FlexItem>
                      <List isPlain data-testid="agent-skill-examples">
                        {skill.examples.map((example) => (
                          <ListItem key={example}>{example}</ListItem>
                        ))}
                      </List>
                    </FlexItem>
                  </Flex>
                </StackItem>
              </Stack>
            </StackItem>
          )}
          {modeSummary && (
            <StackItem>
              <Content
                component={ContentVariants.small}
                className="pf-v6-u-color-200"
                data-testid="agent-skill-modes"
              >
                {modeSummary}
              </Content>
            </StackItem>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};

export default AgentSkillCard;
