import * as React from 'react';
import { List, ListItem, Spinner } from '@patternfly/react-core';
import { getNotebookDisplayName } from '../utils';
import useConnectedNotebooks from './useConnectedNotebooks';

type ConnectedWorkspacesProps = {
  /** @see RelatedToNotebookAnnotations type */
  connectedAnnotation: string; // JSON array value of metadata.name notebooks
};

const ConnectedWorkspaces: React.FC<ConnectedWorkspacesProps> = ({ connectedAnnotation }) => {
  const [connectedNotebooks, loaded, error] = useConnectedNotebooks(connectedAnnotation);

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
