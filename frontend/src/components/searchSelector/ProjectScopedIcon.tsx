import * as React from 'react';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';
import GlobalIcon from '#~/images/icons/GlobalIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';

export type ProjectScopedIconProps = {
  isProject: boolean;
  style?: React.CSSProperties;
  alt?: string;
};

const ProjectScopedIcon: React.FC<ProjectScopedIconProps> = ({ isProject, style, alt }) =>
  isProject ? (
    <TypedObjectIcon alt={alt ?? ''} resourceType={ProjectObjectType.project} style={style} />
  ) : (
    <GlobalIcon style={style} />
  );

export default ProjectScopedIcon;
