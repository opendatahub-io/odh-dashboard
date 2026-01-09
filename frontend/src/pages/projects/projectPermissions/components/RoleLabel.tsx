import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { OpenshiftIcon } from '@patternfly/react-icons';
import { RoleLabelType } from '#~/concepts/permissions/types';

type RoleLabelProps = {
  type?: RoleLabelType;
};

const RoleLabel: React.FC<RoleLabelProps> = ({ type }) => {
  if (!type || type === RoleLabelType.Dashboard) {
    return null;
  }
  if (type === RoleLabelType.OpenshiftDefault) {
    return (
      <Label variant="outline" isCompact color="blue" icon={<OpenshiftIcon />}>
        OpenShift default
      </Label>
    );
  }
  return (
    <Label variant="outline" isCompact color="purple" icon={<OpenshiftIcon />}>
      OpenShift custom
    </Label>
  );
};

export default RoleLabel;
