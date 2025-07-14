import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import ScopedLabel, { ScopedLabelColor } from '#~/components/ScopedLabel';
import { ScopedType } from '#~/pages/modelServing/screens/const';

export type ProjectScopedToggleContentProps = {
  displayName?: string;
  isProject: boolean;
  projectLabel?: string;
  globalLabel?: string;
  isEditing?: boolean;
  style?: React.CSSProperties;
  color?: ScopedLabelColor;
  isCompact?: boolean;
  fallback?: React.ReactNode;
  additionalContent?: React.ReactNode;
};

const ProjectScopedToggleContent: React.FC<ProjectScopedToggleContentProps> = ({
  displayName,
  isProject,
  projectLabel = ScopedType.Project,
  globalLabel = ScopedType.Global,
  isEditing = false,
  style,
  color = 'blue',
  isCompact = true,
  fallback = 'Select one',
  additionalContent,
}) => {
  if (!displayName) {
    return <>{fallback}</>;
  }
  return (
    <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{displayName}</FlexItem>
      {additionalContent && <FlexItem>{additionalContent}</FlexItem>}
      <FlexItem>
        <ScopedLabel
          isProject={isProject}
          variant={isEditing ? 'filled' : 'outline'}
          color={isEditing ? 'grey' : color}
          isCompact={isCompact}
          style={style}
        >
          {isProject ? projectLabel : globalLabel}
        </ScopedLabel>
      </FlexItem>
    </Flex>
  );
};

export default ProjectScopedToggleContent;
