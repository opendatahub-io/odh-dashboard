import * as React from 'react';
import { Alert, FormGroup, Radio, Skeleton, Stack, StackItem } from '@patternfly/react-core';
import { DataConnection, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
} from '~/pages/modelServing/screens/types';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';
import '~/pages/projects/screens/detail/storage/ManageStorageModal.scss';
import DataConnectionExistingField from './DataConnectionExistingField';
import DataConnectionFolderPathField from './DataConnectionFolderPathField';

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

  if (loadError) {
    return (
      <Alert title="Error loading data connections" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

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
                    <DataConnectionExistingField
                      data={data}
                      setData={setData}
                      dataConnections={dataConnections}
                    />
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
                <Stack hasGutter>
                  <StackItem>
                    <AWSField
                      values={data.storage.awsData}
                      onUpdate={(awsData) => setData('storage', { ...data.storage, awsData })}
                    />
                  </StackItem>
                  <StackItem>
                    <DataConnectionFolderPathField
                      folderPath={data.storage.path}
                      setFolderPath={(path) => setData('storage', { ...data.storage, path })}
                    />
                  </StackItem>
                </Stack>
              )
            }
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};

export default DataConnectionSection;
