import * as React from 'react';
import {
  Alert,
  Bullseye,
  Content,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  Label,
  List,
  ListItem,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Timestamp,
} from '@patternfly/react-core';
import {
  filterDeploymentEventRows,
  type DeploymentEventRow,
  type EventSeverityFilter,
} from './deploymentEventRows';

export type DeploymentEventsTabProps = {
  rows: readonly DeploymentEventRow[];
  state: 'loading' | 'denied' | 'review-error' | 'fetch-error' | 'ready';
  failedKinds: readonly string[];
  hasPartialEventError: boolean;
};

const severities: readonly EventSeverityFilter[] = ['All', 'Warning', 'Normal'];
const errorMessages = {
  denied: 'Insufficient permissions to view Events',
  'review-error': 'Unable to check Event permissions',
  'fetch-error': 'Unable to load Events',
};

const DeploymentEventsTab: React.FC<DeploymentEventsTabProps> = ({
  rows,
  state,
  failedKinds,
  hasPartialEventError,
}) => {
  const [search, setSearch] = React.useState('');
  const [severity, setSeverity] = React.useState<EventSeverityFilter>('All');
  const visibleRows = filterDeploymentEventRows(rows, search, severity);
  const error = state === 'loading' || state === 'ready' ? undefined : errorMessages[state];

  return (
    <Stack hasGutter>
      {failedKinds.length > 0 && (
        <StackItem>
          <Alert isInline variant="warning" title="Some Events may be missing">
            Could not load resources of these kinds:{' '}
            {[...new Set(failedKinds)].toSorted().join(', ')}.
          </Alert>
        </StackItem>
      )}
      {hasPartialEventError && (
        <StackItem>
          <Alert isInline variant="warning" title="Some Event sources could not be read" />
        </StackItem>
      )}
      {error && (
        <StackItem>
          <Alert isInline variant="danger" aria-label={error} title={error} />
        </StackItem>
      )}
      {rows.length > 0 && (
        <StackItem>
          <Flex>
            <FlexItem>
              <SearchInput
                aria-label="Search Events"
                placeholder="Search Events"
                value={search}
                onChange={(_event, value) => setSearch(value)}
                onClear={() => setSearch('')}
              />
            </FlexItem>
            <FlexItem>
              <FormSelect
                aria-label="Event severity"
                value={severity}
                onChange={(_event, value) =>
                  setSeverity(severities.find((option) => option === value) ?? 'All')
                }
              >
                {severities.map((option) => (
                  <FormSelectOption key={option} label={option} value={option} />
                ))}
              </FormSelect>
            </FlexItem>
          </Flex>
        </StackItem>
      )}
      {visibleRows.length > 0 && (
        <StackItem>
          <List isPlain isBordered>
            {visibleRows.map((row) => (
              <ListItem key={row.uid} data-testid={`deployment-event-${row.uid}`}>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <Label color={row.severity === 'Warning' ? 'orange' : 'grey'}>
                    {row.severity}
                  </Label>
                  <strong>{row.reason}</strong>
                  {row.timestamp === undefined ? (
                    <span>Timestamp unavailable</span>
                  ) : (
                    <Timestamp
                      date={new Date(row.timestamp)}
                      dateFormat="medium"
                      timeFormat="medium"
                    />
                  )}
                </Flex>
                <Content component="p">{row.message}</Content>
                <Content component="small">{row.source}</Content>
              </ListItem>
            ))}
          </List>
        </StackItem>
      )}
      {state === 'loading' && (
        <StackItem>
          <Bullseye>
            <Spinner aria-label="Loading Events" />
          </Bullseye>
        </StackItem>
      )}
      {state === 'ready' &&
        visibleRows.length === 0 &&
        (rows.length > 0 || (!failedKinds.length && !hasPartialEventError)) && (
          <StackItem>
            <Content component="p">
              {rows.length
                ? 'No matching Events'
                : 'No Events found yet. Events may appear as more resources are discovered.'}
            </Content>
          </StackItem>
        )}
    </Stack>
  );
};

export default DeploymentEventsTab;
