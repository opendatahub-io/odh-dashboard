import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  Label,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  LabeledDataConnection,
} from '~/pages/modelServing/screens/types';
import { filterOutConnectionsWithoutBucket } from '~/pages/modelServing/screens/projects/utils';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';
import SimpleSelect from '~/components/SimpleSelect';
import ConnectionS3FolderPathField from './ConnectionS3FolderPathField';

type DataConnectionExistingFieldType = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  dataConnections: LabeledDataConnection[];
};

const DataConnectionExistingField: React.FC<DataConnectionExistingFieldType> = ({
  data,
  setData,
  dataConnections,
}) => {
  const connectionsWithoutBucket = filterOutConnectionsWithoutBucket(dataConnections);
  const placeholderText =
    connectionsWithoutBucket.length === 0 ? 'No data connections available to select' : 'Select...';

  const selectedDataConnection = connectionsWithoutBucket.find(
    (connection) => connection.dataConnection.data.metadata.name === data.storage.dataConnection,
  );

  const getLabeledOption = (connection: LabeledDataConnection) => (
    <Flex
      spaceItems={{ default: 'spaceItemsXs' }}
      data-testid={`inference-service-data-connection ${connection.dataConnection.data.metadata.name}`}
    >
      <FlexItem>{getDataConnectionDisplayName(connection.dataConnection)}</FlexItem>
      {connection.isRecommended && (
        <FlexItem>
          <Label color="blue" isCompact>
            Recommended
          </Label>
        </FlexItem>
      )}
    </Flex>
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
        <FormGroup label="Name" fieldId="inference-service-data-connection" isRequired>
          <SimpleSelect
            isFullWidth
            options={connectionsWithoutBucket.map((connection) => ({
              key: connection.dataConnection.data.metadata.name,
              dropdownLabel: getLabeledOption(connection),
              label: getDataConnectionDisplayName(connection.dataConnection),
            }))}
            toggleProps={{ id: 'inference-service-data-connection' }}
            value={data.storage.dataConnection}
            toggleLabel={
              selectedDataConnection ? getLabeledOption(selectedDataConnection) : placeholderText
            }
            onChange={(option) => {
              setData('storage', {
                ...data.storage,
                dataConnection: option,
              });
            }}
            popperProps={{ appendTo: 'inline' }}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <ConnectionS3FolderPathField
          folderPath={data.storage.path}
          setFolderPath={(path) => setData('storage', { ...data.storage, path })}
        />
      </StackItem>
    </Stack>
  );
};

export default DataConnectionExistingField;
