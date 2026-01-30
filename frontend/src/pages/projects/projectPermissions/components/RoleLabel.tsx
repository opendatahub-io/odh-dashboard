import * as React from 'react';
import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { OpenshiftIcon } from '@patternfly/react-icons';
import { RoleLabelType, type RoleRef } from '#~/concepts/permissions/types';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import { getRoleLabelTypeForRole, getRoleLabelTypeForRoleRef } from '#~/concepts/permissions/utils';
import { isDefaultRoleRef } from '#~/pages/projects/projectPermissions/utils';
import AiExperienceIcon from '#~/images/icons/AiExperienceIcon.ts';

type RoleLabelProps = {
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
  isCompact?: boolean;
};

const RoleLabel: React.FC<RoleLabelProps> = ({ roleRef, role, isCompact = false }) => {
  const type = role ? getRoleLabelTypeForRole(role) : getRoleLabelTypeForRoleRef(roleRef);
  const isDashboard = type === RoleLabelType.Dashboard;
  const isDefault = isDefaultRoleRef(roleRef);

  const labels: React.ReactNode[] = [];
  const showAiRole = isDashboard || isDefault;
  if (showAiRole) {
    labels.push(
      <Label icon={<AiExperienceIcon />} key="ai-role" variant="outline" isCompact={isCompact}>
        AI role
      </Label>,
    );
  }
  if (type === RoleLabelType.OpenshiftDefault) {
    labels.push(
      <Label
        key="openshift-default"
        variant="outline"
        isCompact={isCompact}
        icon={<OpenshiftIcon />}
      >
        OpenShift default role
      </Label>,
    );
  }
  if (type === RoleLabelType.OpenshiftCustom) {
    labels.push(
      <Label
        key="openshift-custom"
        variant="outline"
        isCompact={isCompact}
        icon={<OpenshiftIcon />}
      >
        OpenShift custom role
      </Label>,
    );
  }

  if (labels.length === 1) {
    return <>{labels[0]}</>;
  }

  return (
    <Flex direction={{ default: 'row' }} gap={{ default: 'gapXs' }}>
      {labels.map((label, index) => (
        <FlexItem key={index}>{label}</FlexItem>
      ))}
    </Flex>
  );
};

export default RoleLabel;
