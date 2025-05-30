import React from 'react';
import { ProjectIcon } from '~/images/icons';
import { IconSize } from '~/types';

export const ProjectIconWithSize: React.FC<{ size: IconSize }> = ({ size }) => (
  <ProjectIcon
    alt=""
    style={{
      width: `var(--pf-t--global--icon--size--font--${size})`,
      height: `var(--pf-t--global--icon--size--font--${size})`,
    }}
  />
);
