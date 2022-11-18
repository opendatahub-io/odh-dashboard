import * as React from 'react';
import {
  Alert,
  FormGroup,
  Radio,
  Select,
  SelectOption,
  Skeleton,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { DataConnection, UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingInferenceServiceObject, InferenceServiceStorageType } from '../../types';
import AWSField from 'pages/projects/dataConnections/AWSField';
import useDataConnections from 'pages/projects/screens/detail/data-connections/useDataConnections';
import { getDataConnectionDisplayName } from 'pages/projects/screens/detail/data-connections/utils';
import '../../../../projects/screens/detail/storage/ManageStorageModal.scss';

type DataConnectionSectionType = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  dataConnectionContext?: DataConnection[];
};

const DataConnectionSection: React.FC<DataConnectionSectionType> = ({
  data,
  setData,
  dataConnectionContext,
}) => {
  const [dataContext, loaded, loadError] = useDataConnections(
    dataConnectionContext ? undefined : data.project,
  );
  const dataConnections = dataConnectionContext || dataContext;
  const [isOpen, setOpen] = React.useState<boolean>(false);

  if (loadError) {
    return (
      <Alert title="Error loading data connections" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  const pathField = () => {
    return (
      <FormGroup label="Folder path">
        <TextInput
          id="storage-path"
          value={data.storage.path}
          onChange={(path) => setData('storage', { ...data.storage, path })}
        />
      </FormGroup>
    );
  };

  return (
    <FormGroup fieldId="data-connection" role="radiogroup">
      <Stack hasGutter>
        <StackItem>
          <Radio
            className="checkbox-radio-fix-body-width"
            name="existing-data-connection-radio"
            id="existing-data-connection-radio"
            label="Existing data connection"
            isChecked={data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE}
            onChange={() =>
              setData('storage', {
                ...data.storage,
                type: InferenceServiceStorageType.EXISTING_STORAGE,
              })
            }
            body={
              data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE && (
                <>
                  {!dataConnectionContext && !loaded && data.project !== '' ? (
                    <Skeleton />
                  ) : (
                    <>
                      <FormGroup label="Name" required>
                        <Select
                          removeFindDomNode
                          id="inference-service-data-connection"
                          isOpen={isOpen}
                          placeholderText={
                            dataConnections.length === 0
                              ? 'No data connections available to select'
                              : 'Select...'
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
                      {pathField()}
                    </>
                  )}
                </>
              )
            }
          />
        </StackItem>
        <StackItem>
          <Radio
            className="checkbox-radio-fix-body-width"
            name="new-data-connection-radio"
            id="new-data-connection-radio"
            label="New data connection"
            isChecked={data.storage.type === InferenceServiceStorageType.NEW_STORAGE}
            onChange={() =>
              setData('storage', { ...data.storage, type: InferenceServiceStorageType.NEW_STORAGE })
            }
            body={
              data.storage.type === InferenceServiceStorageType.NEW_STORAGE && (
                <>
                  <AWSField
                    values={data.storage.awsData}
                    onUpdate={(awsData) => setData('storage', { ...data.storage, awsData })}
                  />
                  {pathField()}
                </>
              )
            }
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default DataConnectionSection;
