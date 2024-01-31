import * as React from 'react';
import {
  Flex,
  FlexItem,
  Icon,
  Stack,
  StackItem,
  Timestamp,
  TimestampFormat,
} from '@patternfly/react-core';
import { GlobeAmericasIcon } from '@patternfly/react-icons';
import { DateTimeKF } from '~/concepts/pipelines/kfTypes';

export type DetailItem = {
  key: string;
  value: React.ReactNode;
};

export const renderDetailItems = (details: DetailItem[], flexKey?: boolean): React.ReactNode => (
  <Stack hasGutter>
    {details.map((detail) => (
      <StackItem key={detail.key}>
        <Flex flexWrap={{ default: 'wrap' }}>
          <FlexItem style={{ width: flexKey ? undefined : 150 }}>
            <b>{detail.key}</b>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>{detail.value}</FlexItem>
        </Flex>
      </StackItem>
    ))}
    <StackItem>&nbsp;</StackItem>
  </Stack>
);

export const asTimestamp = (date: Date): React.ReactNode => (
  <Flex spaceItems={{ default: 'spaceItemsSm' }}>
    <FlexItem>
      <Icon size="sm">
        <GlobeAmericasIcon />
      </Icon>
    </FlexItem>
    <FlexItem>
      <Timestamp date={date} dateFormat={TimestampFormat.full} timeFormat={TimestampFormat.full} />
    </FlexItem>
  </Flex>
);

export const isEmptyDateKF = (date: DateTimeKF): boolean => {
  const INVALID_TIMESTAMP = '1970-01-01T00:00:00Z';
  return date === INVALID_TIMESTAMP;
};
