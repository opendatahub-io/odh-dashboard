import * as React from 'react';
import TypedObjectIcon from '../../design/TypedObjectIcon';
import GlobalIcon from '../../images/icons/GlobalIcon';
import { ProjectObjectType } from '../../design/types';

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
