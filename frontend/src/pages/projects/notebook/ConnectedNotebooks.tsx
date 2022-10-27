import * as React from 'react';
import { List, ListItem, Spinner } from '@patternfly/react-core';
import { getNotebookDisplayName } from '../utils';
import useRelatedNotebooks, { ConnectedNotebookContext } from './useRelatedNotebooks';

type ConnectedNotebooksProps = {
  context: ConnectedNotebookContext;
  relatedResourceName: string;
};

const ConnectedNotebooks: React.FC<ConnectedNotebooksProps> = ({
  context,
  relatedResourceName,
}) => {
  const {
    notebooks: connectedNotebooks,
    loaded,
    error,
  } = useRelatedNotebooks(context, relatedResourceName);

  if (!loaded) {
    return <Spinner size="md" />;
  }

  if (error) {
    // TODO: What is the best way to handle this??
    return <>N/A</>;
  }

  if (connectedNotebooks.length === 0) {
    return <>No connections</>;
  }

  return (
    <List isPlain>
      {connectedNotebooks.map((notebook) => (
        <ListItem key={notebook.metadata.uid}>{getNotebookDisplayName(notebook)}</ListItem>
      ))}
    </List>
  );
};

export default ConnectedNotebooks;
