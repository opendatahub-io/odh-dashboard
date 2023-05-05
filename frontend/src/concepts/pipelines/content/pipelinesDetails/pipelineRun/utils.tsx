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

export type DetailItem = {
  key: string;
  value: React.ReactNode;
};

export const renderDetailItems = (details: DetailItem[], flexKey?: boolean): React.ReactNode => (
  <Stack hasGutter>
    {details.map((detail) => (
      <StackItem key={detail.key}>
        <Flex flexWrap={{ default: 'wrap' }}>
          <FlexItem style={{ width: flexKey ? undefined : 150 }}>{detail.key}</FlexItem>
          <FlexItem>{detail.value}</FlexItem>
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
