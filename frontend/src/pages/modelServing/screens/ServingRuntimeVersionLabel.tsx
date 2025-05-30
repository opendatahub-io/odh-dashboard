import { Label } from '@patternfly/react-core';
import * as React from 'react';

type ServingRuntimeVersionLabelProps = {
  version: string | undefined;
  isCompact?: boolean;
};

const ServingRuntimeVersionLabel: React.FC<ServingRuntimeVersionLabelProps> = ({
  version,
  isCompact,
}) => (
  <Label data-testid="serving-runtime-version-label" color="blue" isCompact={isCompact}>
    {version}
  </Label>
);

export default ServingRuntimeVersionLabel;
