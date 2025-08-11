import React from 'react';
import { Label, LabelProps } from '@patternfly/react-core';

export type FeatureStoreLabelColor =
  | 'blue'
  | 'teal'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'orangered'
  | 'grey'
  | 'yellow';

interface FeatureStoreLabelsProps extends Omit<LabelProps, 'color'> {
  children: React.ReactNode;
  color?: FeatureStoreLabelColor;
  dataTestId?: string;
  icon?: React.ReactNode;
  textMaxWidth?: string;
  variant?: 'outline' | 'filled';
}

const FeatureStoreLabels: React.FC<FeatureStoreLabelsProps> = ({
  children,
  color = 'blue',
  dataTestId,
  icon,
  isCompact,
  style,
  textMaxWidth = '40ch',
  variant,
}) => (
  <Label
    color={color}
    data-testid={dataTestId}
    icon={icon}
    isCompact={isCompact}
    style={style}
    textMaxWidth={textMaxWidth}
    variant={variant}
  >
    {children}
  </Label>
);

export default FeatureStoreLabels;
