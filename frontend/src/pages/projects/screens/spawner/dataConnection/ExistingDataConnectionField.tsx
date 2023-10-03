import * as React from 'react';
import { Alert, FormGroup } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
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
  const [isOpen, setOpen] = React.useState(false);
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
    <FormGroup isRequired label="Data connection" fieldId={fieldId}>
      <Select
        variant="typeahead"
        selections={selectedDataConnection}
        isOpen={isOpen}
        onClear={() => {
          setDataConnection(undefined);
          setOpen(false);
        }}
        isDisabled={empty}
        onSelect={(e, selection) => {
          if (typeof selection === 'string') {
            setDataConnection(selection);
            setOpen(false);
          }
        }}
        onToggle={(e, isExpanded) => setOpen(isExpanded)}
        placeholderText={placeholderText}
        direction="up"
        menuAppendTo="parent"
      >
        {connections.map((connection) => (
          <SelectOption key={connection.data.metadata.name} value={connection.data.metadata.name}>
            {getDataConnectionDisplayName(connection)}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default ExistingDataConnectionField;
