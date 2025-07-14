import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { relativeTime } from '#~/utilities/time';

type LastDeployedProps = {
  resource: K8sResourceCommon;
};

export const LastDeployed: React.FC<LastDeployedProps> = ({ resource }) => {
  let conditions: { type: string; lastTransitionTime?: string }[] = [];
  if (resource.status?.conditions && Array.isArray(resource.status.conditions)) {
    conditions = resource.status.conditions;
  }
  const readyCondition = conditions.find((c) => c.type === 'Ready');

  const creationTimestamp =
    readyCondition?.lastTransitionTime ?? resource.metadata?.creationTimestamp ?? '';

  if (!creationTimestamp) {
    return <>-</>;
  }

  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Timestamp
        date={new Date(creationTimestamp)}
        tooltip={{
          variant: TimestampTooltipVariant.default,
        }}
      >
        {relativeTime(Date.now(), new Date(creationTimestamp).getTime())}
      </Timestamp>
    </span>
  );
};
