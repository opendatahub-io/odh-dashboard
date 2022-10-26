import * as React from 'react';
import { Alert, Chip, ChipGroup, FormGroup, Spinner, Text } from '@patternfly/react-core';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import { getNotebookDisplayName } from '../../../utils';

type ExistingConnectedNotebooksProps = {
  existingNotebooks: string[];
  setExistingNotebooks: (newExistingNotebooks: string[]) => void;
};

const ExistingConnectedNotebooks: React.FC<ExistingConnectedNotebooksProps> = ({
  existingNotebooks,
  setExistingNotebooks,
}) => {
  const {
    notebooks: { data: allNotebooks, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  let content: React.ReactNode;
  if (error) {
    content = (
      <Alert variant="danger" isInline title="Failed to fetch existing connected workbenches">
        {error.message}
      </Alert>
    );
  } else if (!loaded) {
    content = <Spinner size="md" />;
  } else if (existingNotebooks.length === 0) {
    content = <Text component="small">All existing connections have been removed.</Text>;
  } else {
    content = (
      <ChipGroup>
        {existingNotebooks.map((notebookName) => {
          const foundNotebook = allNotebooks.find(
            (notebook) => notebook.notebook.metadata.name === notebookName,
          );
          if (!foundNotebook) {
            return null;
          }
          const notebookDisplayName = getNotebookDisplayName(foundNotebook.notebook);
          return (
            <Chip
              key={notebookDisplayName}
              onClick={() => {
                setExistingNotebooks(
                  existingNotebooks.filter(
                    (existingNotebookName) => existingNotebookName !== notebookName,
                  ),
                );
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
