import React from 'react';
import {
  Checkbox,
  Content,
  List,
  ListItem,
  Panel,
  PanelMain,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { EventKind } from '@odh-dashboard/internal/k8sTypes';
import {
  filterDeploymentEvents,
  getDeploymentEventFilters,
  getEventFullMessage,
  getEventTimestamp,
} from '../../concepts/useWatchDeploymentEvents';

type DeploymentEventLogProps = {
  events: EventKind[];
  deploymentName: string;
  loaded: boolean;
};

const DeploymentEventLog: React.FC<DeploymentEventLogProps> = ({
  events,
  deploymentName,
  loaded,
}) => {
  const filters = React.useMemo(() => getDeploymentEventFilters(deploymentName), [deploymentName]);

  const [activeFilterIds, setActiveFilterIds] = React.useState<Set<string>>(
    () => new Set(['cr', 'pod']),
  );

  const toggleFilter = React.useCallback((filterId: string, checked: boolean) => {
    setActiveFilterIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(filterId);
      } else {
        next.delete(filterId);
      }
      return next;
    });
  }, []);

  const filteredEvents = React.useMemo(
    () =>
      filterDeploymentEvents(events, deploymentName, activeFilterIds).toSorted(
        (a, b) =>
          new Date(getEventTimestamp(b)).getTime() - new Date(getEventTimestamp(a)).getTime(),
      ),
    [events, deploymentName, activeFilterIds],
  );

  return (
    <>
      <Toolbar isSticky>
        <ToolbarContent>
          {filters.map((filter) => (
            <ToolbarItem key={filter.id}>
              <Checkbox
                id={`event-filter-${filter.id}`}
                label={filter.label}
                isChecked={activeFilterIds.has(filter.id)}
                onChange={(_event, checked) => toggleFilter(filter.id, checked)}
              />
            </ToolbarItem>
          ))}
        </ToolbarContent>
      </Toolbar>
      <Panel isScrollable>
        <PanelMain>
          {!loaded ? (
            <Content>Loading events...</Content>
          ) : filteredEvents.length === 0 ? (
            <Content data-testid="no-events-message">No matching events found.</Content>
          ) : (
            <List isPlain isBordered data-testid="deployment-event-logs">
              {filteredEvents.map((event, index) => (
                <ListItem key={event.metadata.uid ?? `event-${index}`}>
                  {getEventFullMessage(event)}
                </ListItem>
              ))}
            </List>
          )}
        </PanelMain>
      </Panel>
    </>
  );
};

export default DeploymentEventLog;
