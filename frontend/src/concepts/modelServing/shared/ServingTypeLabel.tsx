import * as React from 'react';
import { Label } from '@patternfly/react-core';

type ServingTypeLabelProps = {
  text: string;
};

const ServingTypeLabel: React.FC<ServingTypeLabelProps> = ({ text }) => (
  <Label data-testid="serving-platform-label">{text}</Label>
);

export default ServingTypeLabel;
