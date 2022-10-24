import * as React from 'react';
import { NotebookKind } from '../../../../../k8sTypes';
import { Alert, Chip, ChipGroup, FormGroup, Spinner, Text } from '@patternfly/react-core';
import { getNotebook } from '../../../../../api';
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
  const [notebookMap, setNotebookMap] = React.useState<{ [name: string]: NotebookKind }>({});
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  React.useEffect(() => {
    if (existingNotebooks.length > 0) {
      Promise.all(existingNotebooks.map((name) => getNotebook(name, namespace)))
        .then((fetchedNotebooks) => {
          setNotebookMap(
            fetchedNotebooks.reduce(
              (acc, notebook) => ({ ...acc, [notebook.metadata.name]: notebook }),
              {},
            ),
          );
          setLoaded(true);
        })
        .catch((e) => {
          setError(e);
        });
    }
  }, [existingNotebooks, namespace]);

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
          const notebookDisplayName = getNotebookDisplayName(notebookMap[notebookName]);
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
