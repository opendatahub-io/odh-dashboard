import * as React from 'react';
import {
  Content,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  List,
  ListComponent,
  ListItem,
  OrderType,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import { formatDeviceFilterClause } from './celFormatter';
import type {
  DeviceCount,
  DeviceFilter,
  NormalizedDeviceAlternative,
  NormalizedDeviceRequest,
} from './types';

export const UNSUPPORTED_FILTER_TEXT = 'This filter cannot be displayed.';

/** `1` / `All` / raw mode for the row; `1 device` / `All devices` / raw mode with units. */
export const formatDeviceCount = (count: DeviceCount, withUnit = false): string => {
  switch (count.mode) {
    case 'ExactCount':
      return withUnit
        ? `${count.count} ${count.count === 1 ? 'device' : 'devices'}`
        : String(count.count);
    case 'All':
      return withUnit ? 'All devices' : 'All';
    case 'Unknown':
      return count.rawMode;
  }
};

const formatAlternativeSummary = (alternative: NormalizedDeviceAlternative): string =>
  `${formatDeviceCount(alternative.count, true)} · ${alternative.deviceClassName}`;

/** One line per supported clause; unsupported selectors never surface raw CEL. */
export const renderFilters = (filters: DeviceFilter[], testId: string): React.ReactNode => {
  if (filters.length === 0) {
    return 'None';
  }
  return filters.map((filter, filterIndex) =>
    filter.type === 'unsupported' ? (
      // eslint-disable-next-line react/no-array-index-key
      <div key={filterIndex} data-testid={`${testId}-unsupported`}>
        {UNSUPPORTED_FILTER_TEXT}
      </div>
    ) : (
      filter.clauses.map((clause, clauseIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={`${filterIndex}-${clauseIndex}`}>{formatDeviceFilterClause(clause)}</div>
      ))
    ),
  );
};

export type RenderRequestOptions = {
  /** Prefix for every data-testid in the rendered rows. */
  testIdPrefix?: string;
  /** Term for the device class row; workload views label it as requested. */
  deviceClassTerm?: string;
  /** Put the device count before the class, as the workload mockup does. */
  countFirst?: boolean;
};

/** DescriptionList rows for one normalized request; the caller supplies the surrounding list. */
export const renderRequest = (
  request: NormalizedDeviceRequest,
  index: number,
  showName: boolean,
  {
    testIdPrefix = 'device-request',
    deviceClassTerm = 'Device class',
    countFirst = false,
  }: RenderRequestOptions = {},
): React.ReactNode => {
  const testId = `${testIdPrefix}-${index}`;
  const nameRow = showName && (
    <DescriptionListGroup>
      <DescriptionListTerm>Request</DescriptionListTerm>
      <DescriptionListDescription data-testid={`${testId}-name`}>
        <Truncate content={request.name} />
      </DescriptionListDescription>
    </DescriptionListGroup>
  );

  if (request.type === 'exactly') {
    const { selection } = request;
    const classRow = (
      <DescriptionListGroup>
        <DescriptionListTerm>{deviceClassTerm}</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${testId}-device-class`}>
          <Truncate content={selection.deviceClassName} />
        </DescriptionListDescription>
      </DescriptionListGroup>
    );
    const countRow = (
      <DescriptionListGroup>
        <DescriptionListTerm>Requested devices</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${testId}-count`}>
          {formatDeviceCount(selection.count)}
        </DescriptionListDescription>
      </DescriptionListGroup>
    );
    return (
      <React.Fragment key={request.name}>
        {nameRow}
        {countFirst ? countRow : classRow}
        {countFirst ? classRow : countRow}
        <DescriptionListGroup>
          <DescriptionListTerm>Requested filters</DescriptionListTerm>
          <DescriptionListDescription data-testid={`${testId}-filters`}>
            {renderFilters(selection.filters, `${testId}-filters`)}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </React.Fragment>
    );
  }

  if (request.type === 'firstAvailable') {
    return (
      <React.Fragment key={request.name}>
        {nameRow}
        <DescriptionListGroup>
          <DescriptionListTerm>Requested devices · first available</DescriptionListTerm>
          <DescriptionListDescription>
            <Stack hasGutter>
              <StackItem>
                <List
                  component={ListComponent.ol}
                  type={OrderType.number}
                  data-testid={`${testId}-alternatives`}
                >
                  {request.alternatives.map((alternative, alternativeIndex) => (
                    <ListItem
                      key={alternative.name}
                      data-testid={`${testId}-alternative-${alternativeIndex}`}
                    >
                      <div>{formatAlternativeSummary(alternative)}</div>
                      {renderFilters(
                        alternative.filters,
                        `${testId}-alternative-${alternativeIndex}-filters`,
                      )}
                    </ListItem>
                  ))}
                </List>
              </StackItem>
              <StackItem>
                <Content component="small">
                  Options are considered in this order during allocation.
                </Content>
              </StackItem>
            </Stack>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment key={request.name}>
      {nameRow}
      <DescriptionListGroup>
        <DescriptionListTerm>Requested devices</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${testId}-unknown`}>
          This request cannot be displayed.
        </DescriptionListDescription>
      </DescriptionListGroup>
    </React.Fragment>
  );
};
