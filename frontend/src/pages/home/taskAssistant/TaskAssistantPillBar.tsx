import React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';
import { SectionType, sectionTypeLabelColor } from '#~/concepts/design/utils';
import { asEnumMember } from '#~/utilities/utils';
import type { ResolvedTaskGroup } from './types';

type PillGroup = Pick<ResolvedTaskGroup, 'id' | 'label' | 'type' | 'icon'>;

type TaskAssistantPillBarProps = {
  groups: PillGroup[];
  onPillClick: (groupId: string) => void;
};

const TaskAssistantPillBar: React.FC<TaskAssistantPillBarProps> = ({ groups, onPillClick }) => (
  <LabelGroup>
    {groups.map((group) => {
      const sectionType = asEnumMember(group.type, SectionType) ?? SectionType.general;
      const IconComponent = group.icon.default;
      return (
        <Label
          key={group.id}
          variant="outline"
          data-testid={`task-pill-${group.id}`}
          icon={<IconComponent />}
          onClick={() => onPillClick(group.id)}
          color={sectionTypeLabelColor(sectionType)}
        >
          {group.label}
        </Label>
      );
    })}
  </LabelGroup>
);

export default TaskAssistantPillBar;
