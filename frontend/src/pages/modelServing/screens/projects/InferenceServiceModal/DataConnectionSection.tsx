import * as React from 'react';
import { Alert, FormGroup, Radio, Skeleton, Stack, StackItem } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
  LabeledDataConnection,
} from '~/pages/modelServing/screens/types';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import { AwsKeys } from '~/pages/projects/dataConnections/const';
import DataConnectionExistingField from './DataConnectionExistingField';
import ConnectionS3FolderPathField from './ConnectionS3FolderPathField';

type DataConnectionSectionType = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  loaded: boolean;
  loadError: Error | undefined;
  dataConnections: LabeledDataConnection[];
};

const DataConnectionSection: React.FC<DataConnectionSectionType> = ({
  data,
  setData,
  loaded,
  loadError,
  dataConnections,
}) => {
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
            name="existing-data-connection-radio"
            id="existing-data-connection-radio"
            data-testid="existing-data-connection-radio"
            label="Existing data connection"
            isChecked={data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE}
            onChange={() =>
              setData('storage', {
                ...data.storage,
                type: InferenceServiceStorageType.EXISTING_STORAGE,
              })
            }
            body={
              data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE &&
              (!loaded && data.project !== '' ? (
                <Skeleton />
              ) : (
                <DataConnectionExistingField
                  data={data}
                  setData={setData}
                  dataConnections={dataConnections}
                />
              ))
            }
          />
        </StackItem>
        <StackItem>
          <Radio
            name="new-data-connection-radio"
            id="new-data-connection-radio"
            data-testid="new-data-connection-radio"
            label="New data connection"
            isChecked={data.storage.type === InferenceServiceStorageType.NEW_STORAGE}
            onChange={() =>
              setData('storage', {
                ...data.storage,
                type: InferenceServiceStorageType.NEW_STORAGE,
                alert: undefined,
              })
            }
            body={
              data.storage.type === InferenceServiceStorageType.NEW_STORAGE && (
                <Stack hasGutter>
                  {data.storage.alert && (
                    <StackItem>
                      <Alert
                        isInline
                        variant={data.storage.alert.type}
                        title={data.storage.alert.title}
                      >
                        {data.storage.alert.message}
                      </Alert>
                    </StackItem>
                  )}
                  <StackItem>
                    <AWSField
                      values={data.storage.awsData}
                      onUpdate={(awsData) => setData('storage', { ...data.storage, awsData })}
                      additionalRequiredFields={[AwsKeys.AWS_S3_BUCKET]}
                    />
                  </StackItem>
                  <StackItem>
                    <ConnectionS3FolderPathField
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
