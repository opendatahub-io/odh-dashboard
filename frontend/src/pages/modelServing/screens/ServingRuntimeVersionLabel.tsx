import { Label } from '@patternfly/react-core';
import * as React from 'react';

type ServingRuntimeVersionLabelProps = {
  version: string | undefined;
  isCompact?: boolean;
  isEditing?: boolean;
};

const ServingRuntimeVersionLabel: React.FC<ServingRuntimeVersionLabelProps> = ({
  version,
  isCompact,
  isEditing,
}) => (
  <Label
    data-testid="serving-runtime-version-label"
    color={isEditing ? 'grey' : 'blue'}
    isCompact={isCompact}
  >
    {version}
  </Label>
);

export default ServingRuntimeVersionLabel;
