import React from 'react';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { relativeTime } from '../utilities/time';

type LastDeployedProps = {
  resource: K8sResourceCommon;
};

const parseValidDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const LastDeployed: React.FC<LastDeployedProps> = ({ resource }) => {
  const conditions = Array.isArray(resource.status?.conditions)
    ? resource.status.conditions.filter(
        (c): c is NonNullable<typeof c> => c != null && typeof c === 'object',
      )
    : [];

  const readyConditions = conditions.filter((c) => c.type === 'Ready');

  let parsedDate: Date | null = null;

  for (const c of readyConditions) {
    if (c.status === 'True') {
      const d = parseValidDate(c.lastTransitionTime);
      if (d) {
        parsedDate = d;
        break;
      }
    }
  }

  if (!parsedDate) {
    for (const c of readyConditions) {
      const d = parseValidDate(c.lastTransitionTime);
      if (d) {
        parsedDate = d;
        break;
      }
    }
  }

  if (!parsedDate) {
    return <>-</>;
  }

  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Timestamp
        data-testid="last-deployed-timestamp"
        date={parsedDate}
        tooltip={{
          variant: TimestampTooltipVariant.default,
        }}
      >
        {relativeTime(Date.now(), parsedDate.getTime())}
      </Timestamp>
    </span>
  );
};
