import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { OpenshiftIcon } from '@patternfly/react-icons';
import { RoleLabelType } from '#~/concepts/permissions/types';

type RoleLabelProps = {
  type?: RoleLabelType;
  isCompact?: boolean;
};

const RoleLabel: React.FC<RoleLabelProps> = ({ type, isCompact = false }) => {
  if (!type || type === RoleLabelType.Dashboard) {
    return null;
  }
  if (type === RoleLabelType.OpenshiftDefault) {
    return (
      <Label variant="outline" isCompact={isCompact} color="blue" icon={<OpenshiftIcon />}>
        OpenShift default
      </Label>
    );
  }
  return (
    <Label variant="outline" isCompact={isCompact} color="purple" icon={<OpenshiftIcon />}>
      OpenShift custom
    </Label>
  );
};

export default RoleLabel;
