import { Label } from '@patternfly/react-core';
import * as React from 'react';
import { AccessMode, AccessModeLabelMap } from '#~/pages/storageClasses/storageEnums';

const AccessModeLabel: React.FC<{ accessMode: AccessMode }> = ({ accessMode }) => (
  <Label key={accessMode} color="blue" isCompact variant="outline">
    {AccessModeLabelMap[accessMode]}
  </Label>
);

export default AccessModeLabel;
