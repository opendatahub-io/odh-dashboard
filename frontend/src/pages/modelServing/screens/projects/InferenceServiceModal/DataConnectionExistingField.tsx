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
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  LabeledDataConnection,
} from '~/pages/modelServing/screens/types';
import { filterOutConnectionsWithoutBucket } from '~/pages/modelServing/screens/projects/utils';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';
import DataConnectionFolderPathField from './DataConnectionFolderPathField';

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
  const [isOpen, setOpen] = React.useState(false);
  const connectionsWithoutBucket = filterOutConnectionsWithoutBucket(dataConnections);
  const isDataConnectionsEmpty = connectionsWithoutBucket.length === 0;

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
          <Select
            id="inference-service-data-connection"
            isOpen={isOpen}
            placeholderText={
              isDataConnectionsEmpty ? 'No data connections available to select' : 'Select...'
            }
            isDisabled={isDataConnectionsEmpty}
            onToggle={(e, open) => setOpen(open)}
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
            {connectionsWithoutBucket.map((connection) => (
              <SelectOption
                key={connection.dataConnection.data.metadata.name}
                value={connection.dataConnection.data.metadata.name}
              >
                <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                  <FlexItem>{getDataConnectionDisplayName(connection.dataConnection)}</FlexItem>
                  {connection.isRecommended && (
                    <FlexItem>
                      <Label color="blue" isCompact>
                        Recommended
                      </Label>
                    </FlexItem>
                  )}
                </Flex>
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
