import * as React from 'react';
import { Label, LabelGroup, Spinner } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { useRelatedNotebooks, ConnectedNotebookContext } from './useRelatedNotebooks';

type ConnectedNotebookNamesProps = {
  context: ConnectedNotebookContext;
  relatedResourceName: string;
};

const ConnectedNotebookNames: React.FC<ConnectedNotebookNamesProps> = ({
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
    <LabelGroup>
      {connectedNotebooks.map((notebook) => (
        <Label isCompact key={notebook.metadata.uid}>
          {getDisplayNameFromK8sResource(notebook)}
        </Label>
      ))}
    </LabelGroup>
  );
};

export default ConnectedNotebookNames;
