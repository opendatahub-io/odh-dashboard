import * as React from 'react';
import { FormGroup, Select, SelectOption, Stack, StackItem } from '@patternfly/react-core';
import { DataConnection, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';
import './DataConnectionExistingField.scss';
import DataConnectionFolderPathField from './DataConnectionFolderPathField';

type DataConnectionExistingFieldType = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  dataConnections: DataConnection[];
};

const DataConnectionExistingField: React.FC<DataConnectionExistingFieldType> = ({
  data,
  setData,
  dataConnections,
}) => {
  const [isOpen, setOpen] = React.useState(false);
  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Name" isRequired>
          <Select
            removeFindDomNode
            id="inference-service-data-connection"
            isOpen={isOpen}
            placeholderText={
              dataConnections.length === 0 ? 'No data connections available to select' : 'Select...'
            }
            isDisabled={dataConnections.length === 0}
            onToggle={(open) => setOpen(open)}
            onSelect={(_, option) => {
              if (typeof option === 'string') {
                setData('storage', {
                  ...data.storage,
                  dataConnection: option,
                });
                setOpen(false);
              }
            }}
            selections={data.storage.dataConnection}
            menuAppendTo="parent"
          >
            {dataConnections.map((connection) => (
              <SelectOption
                key={connection.data.metadata.name}
                value={connection.data.metadata.name}
              >
                {getDataConnectionDisplayName(connection)}
              </SelectOption>
            ))}
          </Select>
        </FormGroup>
      </StackItem>
      <StackItem>
        <DataConnectionFolderPathField
          folderPath={data.storage.path}
          setFolderPath={(path) => setData('storage', { ...data.storage, path })}
        />
      </StackItem>
    </Stack>
  );
};

export default DataConnectionExistingField;
