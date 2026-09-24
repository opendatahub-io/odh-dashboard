import type { ComponentType, SVGProps } from 'react';
import type { LabelProps } from '@patternfly/react-core';

export type KueueStatusInfo = {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName?: string;
};
