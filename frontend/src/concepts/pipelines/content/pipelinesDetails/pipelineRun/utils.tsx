import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Icon,
  Timestamp,
  TimestampFormat,
} from '@patternfly/react-core';
import { GlobeAmericasIcon } from '@patternfly/react-icons';
import { DateTimeKF, RuntimeConfigParamValue } from '#~/concepts/pipelines/kfTypes';
import { PodKind } from '#~/k8sTypes';
import { PodContainer } from '#~/types';
import { NoValue } from '#~/components/NoValue';

export type DetailItem = {
  key: string;
  value: React.ReactNode;
};

export type PodStatus = {
  podInitializing: boolean;
  running: boolean;
  completed: boolean;
};

export const renderDetailItems = (details: DetailItem[]): React.ReactNode => (
  <DescriptionList isHorizontal horizontalTermWidthModifier={{ lg: '22ch', md: '15ch' }}>
    {details.map((detail) => (
      <DescriptionListGroup
        style={{ alignItems: 'start' }}
        key={detail.key}
        data-testid={`detail-item-${detail.key}`}
      >
        <DescriptionListTerm>{detail.key}</DescriptionListTerm>
        <DescriptionListDescription data-testid="detail-item-value">
          {!detail.value && detail.value !== 0 ? <NoValue /> : detail.value}
        </DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

export const asTimestamp = (date: Date): React.ReactNode => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }}>
    <FlexItem>
      <Icon size="sm">
        <GlobeAmericasIcon />
      </Icon>
    </FlexItem>
    <FlexItem>
      <Timestamp
        shouldDisplayUTC
        date={date}
        dateFormat={TimestampFormat.full}
        timeFormat={TimestampFormat.medium}
      />
    </FlexItem>
  </Flex>
);

export const checkPodContainersStatus = (
  pod: PodKind | null,
  selectedContainer: PodContainer | null,
): PodStatus | null => {
  const containerStatuses = pod?.status?.containerStatuses || [];

  const container = containerStatuses.find((c) => c.name === selectedContainer?.name);

  if (!container) {
    return null;
  }
  const { state } = container;

  return {
    podInitializing: !!state?.waiting,
    running: !!state?.running,
    completed: !!state?.terminated,
  };
};

export const isEmptyDateKF = (date: DateTimeKF): boolean => {
  const INVALID_TIMESTAMP = '1970-01-01T00:00:00Z';
  return date === INVALID_TIMESTAMP;
};

export const normalizeInputParamValue = (
  initialValue: RuntimeConfigParamValue,
): string | number | undefined => {
  let value = initialValue;

  if (typeof value === 'boolean') {
    value = value ? 'True' : 'False';
  }

  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }

  return value;
};
