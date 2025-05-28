import React from 'react';
import { ProjectIcon } from '~/images/icons';

export const ProjectIconWithSize: React.FC<{ size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' }> = ({
  size,
}) => (
  <ProjectIcon
    alt=""
    style={{
      width: `var(--pf-t--global--icon--size--font--${size})`,
      height: `var(--pf-t--global--icon--size--font--${size})`,
    }}
  />
);
