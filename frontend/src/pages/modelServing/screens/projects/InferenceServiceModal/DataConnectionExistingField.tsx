import * as React from 'react';
import { Button, FormGroup, Popover, Stack, StackItem } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DataConnection, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { filterOutConnectionsWithoutBucket } from '~/pages/modelServing/screens/projects/utils';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';
import SimpleSelect from '~/components/SimpleSelect';
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
  const connectionsWithoutBucket = filterOutConnectionsWithoutBucket(dataConnections);
  const isDataConnectionsEmpty = connectionsWithoutBucket.length === 0;
  const placeholderText = isDataConnectionsEmpty
    ? 'No data connections available to select'
    : 'Select...';

  const selectedDataConnection = connectionsWithoutBucket.find(
    (connection) => connection.data.metadata.name === data.storage.dataConnection,
  );
  return (
    <Stack hasGutter>
      <StackItem>
        {dataConnections.length !== 0 && (
          <Popover
            aria-label="No bucket popover"
            bodyContent="Only data connections that include a bucket, which is required for model serving, are included in this list."
          >
            <Button
              style={{ paddingLeft: 0 }}
              variant="link"
              icon={<OutlinedQuestionCircleIcon />}
              iconPosition="left"
            >
              Not seeing what you&apos;re looking for?
            </Button>
          </Popover>
        )}
        <FormGroup label="Name" isRequired>
          <SimpleSelect
            id="inference-service-data-connection"
            isFullWidth
            isDisabled={isDataConnectionsEmpty}
            options={connectionsWithoutBucket.map((connection) => ({
              key: connection.data.metadata.name,
              children: getDataConnectionDisplayName(connection),
            }))}
            selected={data.storage.dataConnection}
            toggleLabel={
              selectedDataConnection
                ? getDataConnectionDisplayName(selectedDataConnection)
                : placeholderText
            }
            onSelect={(_, option) => {
              if (typeof option === 'string') {
                setData('storage', {
                  ...data.storage,
                  dataConnection: option,
                });
              }
            }}
          />
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
