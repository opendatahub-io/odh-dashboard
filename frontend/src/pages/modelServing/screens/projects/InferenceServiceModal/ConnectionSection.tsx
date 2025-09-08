import React from 'react';
import {
  Alert,
  FormGroup,
  FormSection,
  Popover,
  Radio,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import { getResourceNameFromK8sResource } from '#~/concepts/k8s/utils';
import {
  getConnectionTypeRef,
  isModelServingCompatible,
  ModelServingCompatibleTypes,
  S3ConnectionTypeKeys,
  withRequiredFields,
} from '#~/concepts/connectionTypes/utils';
import { useWatchConnectionTypes } from '#~/utilities/useWatchConnectionTypes';
import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
  LabeledConnection,
} from '#~/pages/modelServing/screens/types';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { ExistingConnectionField } from '#~/concepts/connectionTypes/ExistingConnectionField';
import {
  NewConnectionField,
  useNewConnectionField,
  UseNewConnectionFieldData,
} from '#~/concepts/connectionTypes/NewConnectionField';
import {
  getPVCFromURI,
  getPVCNameFromURI,
  isModelPathValid,
  isPVCUri,
} from '#~/pages/modelServing/screens/projects/utils';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import { AccessTypes } from '#~/pages/projects/dataConnections/const';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import ConnectionS3FolderPathField from './ConnectionS3FolderPathField';
import ConnectionOciPathField from './ConnectionOciPathField';
import { ConnectionOciAlert } from './ConnectionOciAlert';
import { PvcSelect } from './PVCSelect';

type ExistingConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  projectConnections: LabeledConnection[];
  selectedConnection?: Connection;
  onSelect: (connection: Connection) => void;
  folderPath: string;
  setFolderPath: (path: string) => void;
  modelUri?: string;
  setModelUri: (uri?: string) => void;
  setIsConnectionValid: (isValid: boolean) => void;
};

const ExistingModelConnectionField: React.FC<ExistingConnectionFieldProps> = ({
  connectionTypes,
  projectConnections,
  selectedConnection,
  onSelect,
  folderPath,
  setFolderPath,
  modelUri,
  setModelUri,
  setIsConnectionValid,
}) => {
  const selectedConnectionType = React.useMemo(
    () =>
      connectionTypes.find(
        (t) => getResourceNameFromK8sResource(t) === getConnectionTypeRef(selectedConnection),
      ),
    [connectionTypes, selectedConnection],
  );

  // todo lift up into hook
  React.useEffect(() => {
    setIsConnectionValid(
      !!selectedConnection && isModelPathValid(selectedConnection, folderPath, modelUri),
    );
  }, [folderPath, modelUri, selectedConnection, setIsConnectionValid]);
  return (
    <>
      <ExistingConnectionField
        connectionTypes={connectionTypes}
        projectConnections={projectConnections}
        selectedConnection={selectedConnection}
        onSelect={onSelect}
        labelHelp={
          <Popover
            aria-label="Hoverable popover"
            bodyContent="This list includes only connections that are compatible with model serving."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        }
      >
        {selectedConnectionType &&
          isModelServingCompatible(selectedConnectionType, ModelServingCompatibleTypes.OCI) && (
            <ConnectionOciAlert />
          )}
      </ExistingConnectionField>
      {selectedConnection &&
        isModelServingCompatible(
          selectedConnection,
          ModelServingCompatibleTypes.S3ObjectStorage,
        ) && <ConnectionS3FolderPathField folderPath={folderPath} setFolderPath={setFolderPath} />}
      {selectedConnection &&
        isModelServingCompatible(selectedConnection, ModelServingCompatibleTypes.OCI) && (
          <ConnectionOciPathField
            ociHost={window.atob(selectedConnection.data?.OCI_HOST ?? '')}
            modelUri={modelUri}
            setModelUri={setModelUri}
          />
        )}
    </>
  );
};

type NewConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  initialNewConnectionType: ConnectionTypeConfigMapObj | undefined;
  initialNewConnectionValues: {
    [key: string]: ConnectionTypeValueType;
  };
  initialConnectionName?: string;
  setNewConnection: (connection: Connection) => void;
  modelUri?: string;
  setModelUri: (uri?: string) => void;
  setIsConnectionValid: (isValid: boolean) => void;
};

const NewModelConnectionField: React.FC<NewConnectionFieldProps> = ({
  connectionTypes,
  data,
  setData,
  initialNewConnectionType,
  initialNewConnectionValues,
  initialConnectionName,
  setNewConnection,
  modelUri,
  setModelUri,
  setIsConnectionValid,
}) => {
  const s3BucketRequired = ((ct) =>
    withRequiredFields(ct, S3ConnectionTypeKeys) ??
    ct) satisfies UseNewConnectionFieldData['extraConnectionTypeModifiers'];
  const accessTypeHasPush = ((field, error, value) => {
    if (field.envVar === 'ACCESS_TYPE' && Array.isArray(value)) {
      if (value.includes(AccessTypes.PUSH) && !value.includes(AccessTypes.PULL)) {
        return 'Access type must include pull';
      }
    }
    return null;
  }) satisfies UseNewConnectionFieldData['extraValidation'];

  const newConnectionData = useNewConnectionField(
    data.project,
    connectionTypes,
    initialConnectionName,
    initialNewConnectionType,
    initialNewConnectionValues,
    s3BucketRequired,
    accessTypeHasPush,
  );

  // todo: remove / lift up to a useConnectionSection hook
  React.useEffect(() => {
    if (newConnectionData.selectedConnectionType && newConnectionData.newConnection) {
      setNewConnection(newConnectionData.newConnection);
      setData('storage', {
        ...data.storage,
        type: InferenceServiceStorageType.NEW_STORAGE,
      });
    }
    setIsConnectionValid(
      newConnectionData.isFormValid &&
        !!newConnectionData.newConnection &&
        isModelPathValid(newConnectionData.newConnection, data.storage.path, modelUri),
    );
  }, [
    newConnectionData.selectedConnectionType,
    newConnectionData.newConnection,
    newConnectionData.isFormValid,
    data.project,
    data.storage.path,
    modelUri,
    data.storage,
    setIsConnectionValid,
    setNewConnection,
    setData,
  ]);

  return (
    <FormSection>
      <NewConnectionField newConnectionData={newConnectionData} />
      {newConnectionData.selectedConnectionType &&
        isModelServingCompatible(
          newConnectionData.selectedConnectionType,
          ModelServingCompatibleTypes.S3ObjectStorage,
        ) && (
          <ConnectionS3FolderPathField
            folderPath={data.storage.path}
            setFolderPath={(path) => setData('storage', { ...data.storage, path })}
          />
        )}
      {newConnectionData.selectedConnectionType &&
        isModelServingCompatible(
          newConnectionData.selectedConnectionType,
          ModelServingCompatibleTypes.OCI,
        ) &&
        (typeof newConnectionData.connectionValues.OCI_HOST === 'string' ||
          typeof newConnectionData.connectionValues.OCI_HOST === 'undefined') && (
          <ConnectionOciPathField
            ociHost={newConnectionData.connectionValues.OCI_HOST}
            modelUri={modelUri}
            setModelUri={setModelUri}
            isNewConnection
          />
        )}
    </FormSection>
  );
};

type Props = {
  existingUriOption?: string;
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  initialNewConnectionType: ConnectionTypeConfigMapObj | undefined;
  initialNewConnectionValues: {
    [key: string]: ConnectionTypeValueType;
  };
  connection: Connection | undefined;
  setConnection: (connection?: Connection) => void;
  setIsConnectionValid: (isValid: boolean) => void;
  loaded?: boolean;
  loadError?: Error | undefined;
  connections?: LabeledConnection[];
  pvcs?: PersistentVolumeClaimKind[];
  connectionTypeFilter?: (ct: ConnectionTypeConfigMapObj) => boolean;
};

// todo convert 'data' into a generic 'modelLocation' obj
export const ConnectionSection: React.FC<Props> = ({
  existingUriOption,
  data,
  setData,
  initialNewConnectionType,
  initialNewConnectionValues,
  connection,
  setConnection,
  setIsConnectionValid,
  loaded,
  loadError,
  connections,
  pvcs,
  connectionTypeFilter = () => true,
}) => {
  const [modelServingConnectionTypes] = useWatchConnectionTypes(true);

  const connectionTypes = React.useMemo(
    () => modelServingConnectionTypes.filter(connectionTypeFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelServingConnectionTypes],
  );
  const hasImagePullSecret = React.useMemo(() => !!data.imagePullSecrets, [data.imagePullSecrets]);

  const pvcNameFromUri: string | undefined = React.useMemo(() => {
    // Get the PVC name from the URI if it's a PVC URI
    if (existingUriOption && isPVCUri(existingUriOption)) {
      return getPVCNameFromURI(existingUriOption);
    }
    return undefined;
  }, [existingUriOption]);

  const selectedPVC = React.useMemo(
    () =>
      pvcs?.find((pvc) => {
        // If user has selected a PVC connection, use that
        if (data.storage.pvcConnection) {
          return pvc.metadata.name === data.storage.pvcConnection;
        }
        // Otherwise, if we have an existing URI, try to find the PVC from that
        if (existingUriOption) {
          return pvc.metadata.name === pvcNameFromUri;
        }
        // If there's no selected PVC and no URI, there is no selected PVC
        return undefined;
      }),
    [pvcs, data.storage.pvcConnection, existingUriOption, pvcNameFromUri],
  );

  const selectedConnection = React.useMemo(
    () =>
      connections?.find(
        (c) => getResourceNameFromK8sResource(c.connection) === data.storage.dataConnection,
      ),
    [connections, data.storage.dataConnection],
  );

  React.useEffect(() => {
    if (selectedConnection && !connection) {
      setConnection(selectedConnection.connection);
    }
  }, [selectedConnection, connection, setConnection]);

  const [prefillComplete, setPrefillComplete] = React.useState(false);
  const didInitialPVCPrefill = React.useRef(false);
  const foundPVC = React.useRef(false);

  const handlePVCPrefill = React.useCallback(
    (uri: string) => {
      const isPVC = isPVCUri(uri);
      const editPVC = isPVC ? getPVCFromURI(uri, pvcs) : undefined;

      if (editPVC) {
        setData('storage', {
          ...data.storage,
          pvcConnection: editPVC.metadata.name,
          type: InferenceServiceStorageType.PVC_STORAGE,
          uri: existingUriOption,
        });
        foundPVC.current = true;
      } else if (pvcNameFromUri) {
        setData('storage', {
          ...data.storage,
          type: InferenceServiceStorageType.PVC_STORAGE,
          uri: existingUriOption,
        });
      } else {
        setData('storage', {
          ...data.storage,
          type: InferenceServiceStorageType.EXISTING_URI,
          uri: existingUriOption,
        });
      }
      didInitialPVCPrefill.current = true;
      setPrefillComplete(true);
    },
    [pvcs, existingUriOption, data.storage, setData],
  );

  React.useEffect(() => {
    if (!loaded) {
      return;
    }

    // Only prefill if not already done
    if (!didInitialPVCPrefill.current) {
      // If editing, and storage type is already set to something other than URI/PVC, just mark as complete
      if (
        data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE ||
        data.storage.type === InferenceServiceStorageType.NEW_STORAGE
      ) {
        didInitialPVCPrefill.current = true;
        setPrefillComplete(true);
        return;
      }

      // Otherwise, handle PVC/URI prefill
      if (existingUriOption !== undefined && pvcNameFromUri) {
        handlePVCPrefill(existingUriOption);
      }

      // If nothing to prefill, just mark as complete
      didInitialPVCPrefill.current = true;
      setPrefillComplete(true);
    }
  }, [loaded, pvcs, existingUriOption, data.storage, setData, handlePVCPrefill]);

  if (loadError) {
    return (
      <Alert title="Error loading connections" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  if (!loaded || !prefillComplete) {
    return <Skeleton />;
  }
  return (
    <>
      {existingUriOption && !hasImagePullSecret && !pvcNameFromUri && (
        <Radio
          id="existing-uri-radio"
          name="existing-uri-radio"
          data-testid="existing-uri-radio"
          label="Current URI"
          isChecked={data.storage.type === InferenceServiceStorageType.EXISTING_URI}
          onChange={() => {
            setConnection(undefined);
            setData('storage', {
              ...data.storage,
              type: InferenceServiceStorageType.EXISTING_URI,
              uri: existingUriOption,
              alert: undefined,
            });
          }}
          body={data.storage.type === InferenceServiceStorageType.EXISTING_URI && data.storage.uri}
        />
      )}
      {connections?.length !== 0 ? (
        <>
          <Radio
            name="existing-connection-radio"
            id="existing-connection-radio"
            data-testid="existing-connection-radio"
            label="Existing connection"
            isChecked={data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE}
            onChange={() => {
              setConnection(undefined);
              setData('storage', {
                ...data.storage,
                type: InferenceServiceStorageType.EXISTING_STORAGE,
                uri: undefined,
                alert: undefined,
              });
            }}
            body={
              data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE &&
              connections && (
                <ExistingModelConnectionField
                  connectionTypes={connectionTypes}
                  projectConnections={connections}
                  selectedConnection={selectedConnection?.connection}
                  onSelect={(selection) => {
                    setConnection(selection);
                    setData('storage', {
                      ...data.storage,
                      dataConnection: getResourceNameFromK8sResource(selection),
                      // Clear the URI when switching connections
                      uri:
                        data.storage.dataConnection &&
                        getResourceNameFromK8sResource(selection) !== data.storage.dataConnection
                          ? undefined
                          : data.storage.uri,
                    });
                  }}
                  folderPath={data.storage.path}
                  setFolderPath={(path) => setData('storage', { ...data.storage, path })}
                  modelUri={data.storage.uri}
                  setModelUri={(uri) => setData('storage', { ...data.storage, uri })}
                  setIsConnectionValid={setIsConnectionValid}
                />
              )
            }
          />
          <Radio
            name="new-connection-radio"
            id="new-connection-radio"
            data-testid="new-connection-radio"
            label="Create connection"
            isChecked={data.storage.type === InferenceServiceStorageType.NEW_STORAGE}
            onChange={() => {
              setConnection(undefined);
              setData('storage', {
                ...data.storage,
                type: InferenceServiceStorageType.NEW_STORAGE,
                dataConnection: '',
                uri: undefined,
                alert: undefined,
              });
            }}
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
                  <NewModelConnectionField
                    connectionTypes={connectionTypes}
                    data={data}
                    setData={setData}
                    initialNewConnectionType={initialNewConnectionType}
                    initialNewConnectionValues={initialNewConnectionValues}
                    initialConnectionName={data.storage.dataConnection}
                    setNewConnection={setConnection}
                    modelUri={data.storage.uri}
                    setModelUri={(uri) => setData('storage', { ...data.storage, uri })}
                    setIsConnectionValid={setIsConnectionValid}
                  />
                </Stack>
              )
            }
          />
          {(pvcs && pvcs.length > 0) || pvcNameFromUri ? (
            <Radio
              label="Existing cluster storage"
              name="pvc-serving-radio"
              id="pvc-serving-radio"
              data-testid="pvc-serving-radio"
              isChecked={data.storage.type === InferenceServiceStorageType.PVC_STORAGE}
              onChange={() => {
                setConnection(undefined);
                setData('storage', {
                  ...data.storage,
                  type: InferenceServiceStorageType.PVC_STORAGE,
                  uri: undefined,
                  alert: undefined,
                });
              }}
              body={
                data.storage.type === InferenceServiceStorageType.PVC_STORAGE && (
                  <PvcSelect
                    pvcs={pvcs}
                    selectedPVC={selectedPVC}
                    onSelect={(selection?: PersistentVolumeClaimKind | undefined) => {
                      setData('storage', {
                        ...data.storage,
                        type: InferenceServiceStorageType.PVC_STORAGE,
                        pvcConnection: selection?.metadata.name ?? '',
                      });
                    }}
                    setModelUri={(uri) => setData('storage', { ...data.storage, uri })}
                    setIsConnectionValid={setIsConnectionValid}
                    existingUriOption={existingUriOption}
                    pvcNameFromUri={pvcNameFromUri}
                  />
                )
              }
            />
          ) : null}
        </>
      ) : pvcs && pvcs.length === 0 ? ( // No connections and no pvcs
        <FormGroup
          name="new-connection"
          id="new-connection"
          data-testid="new-connection"
          className="pf-v6-u-mb-lg"
        >
          <Stack hasGutter>
            {data.storage.alert && (
              <StackItem>
                <Alert isInline variant={data.storage.alert.type} title={data.storage.alert.title}>
                  {data.storage.alert.message}
                </Alert>
              </StackItem>
            )}
            <NewModelConnectionField
              connectionTypes={connectionTypes}
              data={data}
              setData={setData}
              initialNewConnectionType={initialNewConnectionType}
              initialNewConnectionValues={initialNewConnectionValues}
              initialConnectionName={data.storage.dataConnection}
              setNewConnection={setConnection}
              modelUri={data.storage.uri}
              setModelUri={(uri) => setData('storage', { ...data.storage, uri })}
              setIsConnectionValid={setIsConnectionValid}
            />
          </Stack>
        </FormGroup>
      ) : (
        // No connections, but there are pvcs
        <Radio
          name="new-connection-radio"
          id="new-connection-radio"
          data-testid="new-connection-radio"
          label="Create connection"
          className="pf-v6-u-mb-lg"
          isChecked={data.storage.type === InferenceServiceStorageType.NEW_STORAGE}
          onChange={() => {
            setConnection(undefined);
            setData('storage', {
              ...data.storage,
              type: InferenceServiceStorageType.NEW_STORAGE,
              dataConnection: '',
              uri: undefined,
              alert: undefined,
            });
          }}
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
                <NewModelConnectionField
                  connectionTypes={connectionTypes}
                  data={data}
                  setData={setData}
                  initialNewConnectionType={initialNewConnectionType}
                  initialNewConnectionValues={initialNewConnectionValues}
                  initialConnectionName={data.storage.dataConnection}
                  setNewConnection={setConnection}
                  modelUri={data.storage.uri}
                  setModelUri={(uri) => setData('storage', { ...data.storage, uri })}
                  setIsConnectionValid={setIsConnectionValid}
                />
              </Stack>
            )
          }
        />
      )}
    </>
  );
};
