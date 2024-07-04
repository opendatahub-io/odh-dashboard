import * as React from 'react';
import { Alert, FormGroup } from '@patternfly/react-core';
import { TypeaheadSelect } from '@patternfly/react-templates';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';

type ExistingDataConnectionFieldProps = {
  fieldId: string;
  selectedDataConnection?: string;
  setDataConnection: (name?: string) => void;
};

const ExistingDataConnectionField: React.FC<ExistingDataConnectionFieldProps> = ({
  fieldId,
  selectedDataConnection,
  setDataConnection,
}) => {
  const {
    dataConnections: { data: connections, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  if (error) {
    return (
      <Alert title="Error loading data connections" variant="danger">
        {error.message}
      </Alert>
    );
  }

  const empty = connections.length === 0;
  let placeholderText: string;
  if (!loaded) {
    placeholderText = 'Loading data connections...';
  } else if (empty) {
    placeholderText = 'No existing data connections available';
  } else {
    placeholderText = 'Select a data connection';
  }

  return (
    <FormGroup
      isRequired
      label="Data connection"
      fieldId={fieldId}
      data-testid="data-connection-group"
    >
      <TypeaheadSelect
        initialOptions={
          loaded
            ? connections.map((connection) => ({
                value: connection.data.metadata.name,
                content: getDataConnectionDisplayName(connection),
                selected: connection.data.metadata.name === selectedDataConnection,
              }))
            : []
        }
        onSelect={(_ev, selection) => setDataConnection(String(selection))}
        onClearSelection={() => setDataConnection()}
        placeholder={placeholderText}
        noOptionsFoundMessage={(filter) => `No data connection was found for "${filter}"`}
        isDisabled={!loaded || connections.length === 0}
      />
    </FormGroup>
  );
};

export default ExistingDataConnectionField;
