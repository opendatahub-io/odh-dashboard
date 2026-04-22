import React from 'react';
import {
  Button,
  ButtonVariant,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import TypeBorderedCard from '#~/concepts/design/TypeBorderedCard';
import SectionIcon from '#~/concepts/design/SectionIcon';
import { SectionType } from '#~/concepts/design/utils';
import { asEnumMember } from '#~/utilities/utils';
import type { ResolvedTaskGroup, ResolvedTaskItem } from './types';

type TaskGroupCardProps = {
  group: Pick<ResolvedTaskGroup, 'id' | 'title' | 'description' | 'type' | 'icon'>;
  tasks: Pick<ResolvedTaskItem, 'id' | 'title' | 'href'>[];
};

const TaskGroupCard: React.FC<TaskGroupCardProps> = ({ group, tasks }) => {
  const sectionType = asEnumMember(group.type, SectionType) ?? SectionType.general;

  return (
    <TypeBorderedCard
      sectionType={sectionType}
      isFullHeight
      data-testid={`task-group-card-${group.id}`}
    >
      <CardHeader>
        <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsFlexStart' }}>
          <FlexItem>
            <SectionIcon icon={group.icon.default} sectionType={sectionType} />
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <CardTitle>{group.title}</CardTitle>
            <Content component="p">{group.description}</Content>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <Stack hasGutter>
          {tasks.map((task) => (
            <StackItem key={task.id}>
              <Button
                variant={ButtonVariant.link}
                isInline
                component={(props: React.ComponentProps<'a'>) => <Link {...props} to={task.href} />}
                data-testid={`task-link-${task.id}`}
              >
                {task.title}
              </Button>
            </StackItem>
          ))}
        </Stack>
      </CardBody>
    </TypeBorderedCard>
  );
};

export default TaskGroupCard;
