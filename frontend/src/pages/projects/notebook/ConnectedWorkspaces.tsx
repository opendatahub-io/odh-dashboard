import * as React from 'react';
import { List, ListItem, Spinner } from '@patternfly/react-core';
import { getNotebookDisplayName } from '../utils';
import useRelatedNotebooks, { ConnectedWorkspaceContext } from './useRelatedNotebooks';

type ConnectedWorkspacesProps = {
  context: ConnectedWorkspaceContext;
  relatedResourceName: string;
};

const ConnectedWorkspaces: React.FC<ConnectedWorkspacesProps> = ({
  context,
  relatedResourceName,
}) => {
  const { connectedNotebooks, loaded, error } = useRelatedNotebooks(context, relatedResourceName);

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

export default ConnectedWorkspaces;
