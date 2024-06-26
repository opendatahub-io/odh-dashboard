import * as React from 'react';
import { Alert, Chip, ChipGroup, FormGroup, Spinner, Text } from '@patternfly/react-core';
import { NotebookKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type ExistingConnectedNotebooksProps = {
  connectedNotebooks: NotebookKind[];
  onNotebookRemove: (notebook: NotebookKind) => void;
  loaded: boolean;
  error?: Error;
};

const ExistingConnectedNotebooks: React.FC<ExistingConnectedNotebooksProps> = ({
  connectedNotebooks,
  onNotebookRemove,
  loaded,
  error,
}) => {
  const [notebooksToShow, setNotebooksToShow] = React.useState<NotebookKind[]>(connectedNotebooks);
  let content: React.ReactNode;
  if (error) {
    content = (
      <Alert variant="danger" isInline title="Failed to fetch existing connected workbenches">
        {error.message}
      </Alert>
    );
  } else if (!loaded) {
    content = <Spinner size="md" />;
  } else if (notebooksToShow.length === 0) {
    content = <Text component="small">All existing connections have been removed.</Text>;
  } else {
    content = (
      <ChipGroup>
        {notebooksToShow.map((notebook) => {
          const notebookDisplayName = getDisplayNameFromK8sResource(notebook);
          return (
            <Chip
              key={notebookDisplayName}
              onClick={() => {
                setNotebooksToShow(
                  notebooksToShow.filter(
                    (notebookToShow) => notebookToShow.metadata.name !== notebook.metadata.name,
                  ),
                );
                onNotebookRemove(notebook);
              }}
            >
              {notebookDisplayName}
            </Chip>
          );
        })}
      </ChipGroup>
    );
  }

  return <FormGroup label="Existing connected workbenches">{content}</FormGroup>;
};

export default ExistingConnectedNotebooks;
