import * as React from 'react';
import { Label } from '@patternfly/react-core';
import ProjectScopedIcon from '~/components/searchSelector/ProjectScopedIcon';

export type ScopedLabelColor =
  | 'blue'
  | 'teal'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'orangered'
  | 'grey'
  | 'yellow';

export type ScopedLabelProps = {
  isProject: boolean;
  children: React.ReactNode;
  dataTestId?: string;
  isCompact?: boolean;
  variant?: 'outline' | 'filled';
  color?: ScopedLabelColor;
  style?: React.CSSProperties;
};

const ScopedLabel: React.FC<ScopedLabelProps> = ({
  isProject = false,
  children,
  dataTestId,
  isCompact = true,
  variant = 'outline',
  color = 'blue',
  style,
}) => (
  <Label
    variant={variant}
    color={color}
    data-testid={dataTestId || (isProject ? 'project-scoped-label' : 'global-scoped-label')}
    isCompact={isCompact}
    icon={<ProjectScopedIcon isProject={isProject} alt="" />}
    style={style}
  >
    {children}
  </Label>
);

export default ScopedLabel;
