import React from 'react';
import { Alert, AlertVariant, Radio, Skeleton, Stack, StackItem } from '@patternfly/react-core';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { S3ConnectionTypeKeys, withRequiredFields } from '~/concepts/connectionTypes/utils';
import { InferenceServiceStorageType, LabeledConnection } from '~/pages/modelServing/screens/types';
import { useWatchConnectionTypes } from '~/utilities/useWatchConnectionTypes';
import { getResourceNameFromK8sResource } from '~/concepts/k8s/utils';
import { NewModelConnectionField } from './NewModelConnectionField';
import { ExistingModelConnectionField } from './ExistingModelConnectionField';
import { ModelConnection } from './types';

export type UseModelConnectionSectionData = {
  projectName: string;
  //
  selectedRadioOption: InferenceServiceStorageType;
  setSelectedRadioOption: (option: InferenceServiceStorageType) => void;
  //
  connectionTypes: ConnectionTypeConfigMapObj[];
  selectedConnectionType?: ConnectionTypeConfigMapObj;
  setSelectedConnectionType: (ct: ConnectionTypeConfigMapObj) => void;
  //
  connections?: LabeledConnection[];
  //
  existingModelLocation?: ModelConnection;
  modelLocation?: ModelConnection;
  setModelLocation: (model?: ModelConnection) => void;
  isModelLocationValid?: boolean;
  setIsModelLocationValid: (isValid: boolean) => void;
  //
  loaded?: boolean;
  loadError?: Error | undefined;
};

export const useModelLocationSection = (
  projectName: string,
  existingModelLocation?: ModelConnection,
  initialModelLocation?: ModelConnection,
  initialConnectionType?: ConnectionTypeConfigMapObj,
): UseModelConnectionSectionData => {
  const [tmpConnectionTypes, connectionTypesLoaded, connectionTypesError] =
    useWatchConnectionTypes(true);
  const connectionTypes = React.useMemo(
    () =>
      tmpConnectionTypes
        .map((ct) => withRequiredFields(ct, S3ConnectionTypeKeys))
        .filter((ct) => !!ct),
    [tmpConnectionTypes],
  );

  const [selectedRadioOption, setSelectedRadioOption] = React.useState<InferenceServiceStorageType>(
    () => {
      if (!existingModelLocation?.connection && existingModelLocation?.uri) {
        return InferenceServiceStorageType.EXISTING_URI;
      }
      // if (projectConnections === 0) {
      //   return InferenceServiceStorageType.NEW_STORAGE
      // }
      return InferenceServiceStorageType.EXISTING_STORAGE;
    },
  );

  const [tmpModelLocation, setModelLocation] = React.useState<ModelConnection>();
  const modelLocation = React.useMemo(
    () =>
      tmpModelLocation === undefined
        ? initialModelLocation || existingModelLocation
        : tmpModelLocation,
    [tmpModelLocation, initialModelLocation, existingModelLocation],
  );

  const [tmpSelectedConnectionType, setSelectedConnectionType] =
    React.useState<ConnectionTypeConfigMapObj>();
  const selectedConnectionType = React.useMemo(() => {
    const ctToFind =
      tmpSelectedConnectionType === undefined ? initialConnectionType : tmpSelectedConnectionType;
    return ctToFind
      ? connectionTypes.find(
          (ct) => getResourceNameFromK8sResource(ctToFind) === getResourceNameFromK8sResource(ct),
        )
      : undefined;
  }, [connectionTypes, tmpSelectedConnectionType, initialConnectionType]);

  const [isModelLocationValid, setIsModelLocationValid] = React.useState(false);

  return {
    projectName,
    selectedRadioOption,
    setSelectedRadioOption,
    connectionTypes,
    selectedConnectionType,
    setSelectedConnectionType,
    // connections,
    existingModelLocation,
    modelLocation,
    setModelLocation,
    isModelLocationValid,
    setIsModelLocationValid,
    //
    loaded: connectionTypesLoaded,
    loadError: connectionTypesError,
  };
};

type Props = {
  projectName: string;
  modelConnectionData: UseModelConnectionSectionData;
  //
  selectedRadioOption: InferenceServiceStorageType;
  setSelectedRadioOption: (option: InferenceServiceStorageType) => void;
  //
  connectionTypes: ConnectionTypeConfigMapObj[];
  selectedConnectionType?: ConnectionTypeConfigMapObj;
  // setSelectedConnectionType: (ct: ConnectionTypeConfigMapObj) => void;
  //
  connections?: LabeledConnection[];
  //
  existingModelLocation?: ModelConnection;
  modelLocation?: ModelConnection;
  setModelLocation: (model?: ModelConnection) => void;
  setIsModelLocationValid: (isValid: boolean) => void;
  //
  loaded?: boolean;
  loadError?: Error | undefined;
  alert?: {
    type: AlertVariant;
    title: string;
    message: string;
  };
};

export const ConnectionSection: React.FC<Props> = ({
  // projectName,
  modelConnectionData,
  // selectedRadioOption,
  // setSelectedRadioOption,
  // existingModelLocation,
  // connectionTypes,
  // selectedConnectionType,
  // // setSelectedConnectionType,
  // modelLocation,
  // setModelLocation,
  // setIsConnectionValid,
  // loaded,
  // loadError,
  // connections,
  alert,
}) => {
  const {
    projectName,
    selectedRadioOption,
    setSelectedRadioOption,
    existingModelLocation,
    connectionTypes,
    selectedConnectionType,
    // setSelectedConnectionType,
    modelLocation,
    setModelLocation,
    setIsModelLocationValid,
    loaded,
    loadError,
    connections,
    // alert,
  } = modelConnectionData;
  // React.useEffect(() => {
  //   if (selectedConnection && !connection) {
  //     setConnection(selectedConnection.connection);
  //   }
  // }, [selectedConnection, connection, setConnection]);

  if (loadError) {
    return (
      <Alert title="Error loading connections" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  if (!loaded) {
    return <Skeleton />;
  }

  return (
    <>
      {existingModelLocation?.uri && !existingModelLocation.connection && (
        <Radio
          id="existing-uri-radio"
          name="existing-uri-radio"
          data-testid="existing-uri-radio"
          label="Current URI"
          isChecked={selectedRadioOption === InferenceServiceStorageType.EXISTING_URI}
          onChange={() => {
            setModelLocation(undefined);
            setSelectedRadioOption(InferenceServiceStorageType.EXISTING_URI);
          }}
          body={
            selectedRadioOption === InferenceServiceStorageType.EXISTING_URI &&
            existingModelLocation.uri
          }
        />
      )}
      <Radio
        name="existing-connection-radio"
        id="existing-connection-radio"
        data-testid="existing-connection-radio"
        label="Existing connection"
        isChecked={selectedRadioOption === InferenceServiceStorageType.EXISTING_STORAGE}
        onChange={() => {
          setModelLocation(undefined);
          setSelectedRadioOption(InferenceServiceStorageType.EXISTING_STORAGE);
        }}
        body={
          selectedRadioOption === InferenceServiceStorageType.EXISTING_STORAGE &&
          connections && (
            <ExistingModelConnectionField
              connectionTypes={connectionTypes}
              projectConnections={connections}
              modelConnection={modelLocation}
              setModelConnection={setModelLocation}
              setIsModelConnectionValid={setIsModelLocationValid}
            />
          )
        }
      />
      <Radio
        name="new-connection-radio"
        id="new-connection-radio"
        data-testid="new-connection-radio"
        label="Create connection"
        className="pf-v6-u-mb-lg"
        isChecked={selectedRadioOption === InferenceServiceStorageType.NEW_STORAGE}
        onChange={() => {
          setModelLocation(undefined);
          setSelectedRadioOption(InferenceServiceStorageType.NEW_STORAGE);
        }}
        body={
          selectedRadioOption === InferenceServiceStorageType.NEW_STORAGE && (
            <Stack hasGutter>
              {alert && (
                <StackItem>
                  <Alert isInline variant={alert.type} title={alert.title}>
                    {alert.message}
                  </Alert>
                </StackItem>
              )}
              <NewModelConnectionField
                projectName={projectName}
                connectionTypes={connectionTypes}
                modelConnection={modelLocation}
                setModelConnection={setModelLocation}
                setIsModelConnectionValid={setIsModelLocationValid}
                selectedConnectionType={selectedConnectionType}
                extraValidation={(field, error, value) => {
                  if (field.envVar === 'ACCESS_TYPE' && Array.isArray(value)) {
                    if (value.includes('Push') && !value.includes('Pull')) {
                      return 'Access type must include pull';
                    }
                  }
                  return null;
                }}
              />
            </Stack>
          )
        }
      />
    </>
  );
};
