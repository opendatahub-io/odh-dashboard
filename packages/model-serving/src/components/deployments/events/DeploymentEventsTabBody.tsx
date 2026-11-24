import * as React from 'react';
import {
  Alert,
  Bullseye,
  Content,
  Flex,
  FlexItem,
  Label,
  List,
  ListItem,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Switch,
  Timestamp,
} from '@patternfly/react-core';
import { SyncIcon } from '@patternfly/react-icons';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import {
  filterDeploymentEventRows,
  type DeploymentEventRow,
  type EventSeverityFilter,
} from './deploymentEventRows';

export type DeploymentEventsTabBodyProps = {
  rows: readonly DeploymentEventRow[];
  state: 'loading' | 'denied' | 'review-error' | 'fetch-error' | 'ready';
  failedKinds: readonly string[];
  hasPartialEventError: boolean;
  autoRefresh?: { enabled: boolean; onChange: (enabled: boolean) => void };
};

const severities: readonly EventSeverityFilter[] = ['All', 'Warning', 'Normal'];
const severityOptions = severities.map((key) => ({ key, label: key }));
const errorMessages = {
  denied: 'Insufficient permissions to view Events',
  'review-error': 'Unable to check Event permissions',
  'fetch-error': 'Unable to load Events',
};

const DeploymentEventsTabBody: React.FC<DeploymentEventsTabBodyProps> = ({
  rows,
  state,
  failedKinds,
  hasPartialEventError,
  autoRefresh,
}) => {
  const autoRefreshId = React.useId();
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
      {(rows.length > 0 || autoRefresh) && (
        <StackItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem flex={{ default: 'flex_1' }}>
              <SearchInput
                aria-label="Search Events"
                placeholder="Filter events..."
                value={search}
                onChange={(_event, value) => setSearch(value)}
                onClear={() => setSearch('')}
              />
            </FlexItem>
            <FlexItem>
              <SimpleSelect
                ariaLabel={`Severity: ${severity}`}
                toggleLabel={`Severity: ${severity}`}
                toggleProps={{ isInForm: true }}
                value={severity}
                options={severityOptions}
                onChange={(value) =>
                  setSeverity(severities.find((option) => option === value) ?? 'All')
                }
              />
            </FlexItem>
            {autoRefresh && (
              <FlexItem>
                <Switch
                  id={autoRefreshId}
                  label={
                    <>
                      <SyncIcon aria-hidden="true" /> Auto-refresh
                    </>
                  }
                  isChecked={autoRefresh.enabled}
                  onChange={(_event, checked) => autoRefresh.onChange(checked)}
                />
              </FlexItem>
            )}
          </Flex>
        </StackItem>
      )}
      {visibleRows.length > 0 && (
        <StackItem>
          <List isPlain isBordered>
            {visibleRows.map((row) => (
              <ListItem key={row.uid} data-testid={`deployment-event-${row.uid}`}>
                <Flex alignItems={{ default: 'alignItemsCenter' }}>
                  <Label
                    status={
                      row.severity === 'Warning'
                        ? 'warning'
                        : row.severity === 'Normal'
                        ? 'info'
                        : undefined
                    }
                  >
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
                <Content component="p" className="pf-v6-u-mt-xs">
                  {row.message}
                </Content>
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

export default DeploymentEventsTabBody;
