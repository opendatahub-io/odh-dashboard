import * as React from 'react';
import { List, ListItem } from '@patternfly/react-core';
import { EventKind } from '#~/k8sTypes';
import { getEventTimestamp, getEventFullMessage } from '#~/utilities/notebookControllerUtils';

type EventLogProps = {
  events: EventKind[];
  initialMessage?: string;
  dataTestId?: string;
};

const EventLog: React.FC<EventLogProps> = ({
  events,
  initialMessage,
  dataTestId = 'k8s-event-logs',
}) => (
  <List isPlain isBordered data-testid={dataTestId}>
    {events
      .toSorted(
        (a, b) =>
          new Date(getEventTimestamp(b)).getTime() - new Date(getEventTimestamp(a)).getTime(),
      )
      .map((event, index) => (
        <ListItem key={`event-${event.metadata.uid ?? index}`}>
          {getEventFullMessage(event)}
        </ListItem>
      ))}
    {initialMessage && <ListItem>{initialMessage}</ListItem>}
  </List>
);

export default EventLog;
