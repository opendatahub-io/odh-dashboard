import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  FormSection,
  Popover,
  Radio,
  Truncate,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '~/concepts/k8s/utils';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
} from '~/concepts/connectionTypes/types';
import ConnectionTypeForm from '~/concepts/connectionTypes/ConnectionTypeForm';
import { useK8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import {
  assembleConnectionSecret,
  getConnectionTypeDisplayName,
  getConnectionTypeRef,
  getDefaultValues,
  isConnectionTypeDataField,
  isUriConnection,
  isUriConnectionType,
  S3ConnectionTypeKeys,
  withRequiredFields,
} from '~/concepts/connectionTypes/utils';
import { ConnectionDetailsHelperText } from '~/concepts/connectionTypes/ConnectionDetailsHelperText';
import { useWatchConnectionTypes } from '~/utilities/useWatchConnectionTypes';
import TypeaheadSelect, { TypeaheadSelectOption } from '~/components/TypeaheadSelect';
import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
} from '~/pages/modelServing/screens/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useConnections from '~/pages/projects/screens/detail/connections/useConnections';
import { isConnectionPathValid } from '~/pages/modelServing/screens/projects/utils';
import DataConnectionFolderPathField from './DataConnectionFolderPathField';

type ExistingConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  projectConnections: Connection[];
  selectedConnection?: Connection;
  onSelect: (connection: Connection) => void;
  folderPath: string;
  setFolderPath: (path: string) => void;
  setIsConnectionValid: (isValid: boolean) => void;
};

const ExistingConnectionField: React.FC<ExistingConnectionFieldProps> = ({
  connectionTypes,
  projectConnections,
  selectedConnection,
  onSelect,
  folderPath,
  setFolderPath,
  setIsConnectionValid,
}) => {
  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      projectConnections.map((connection) => ({
        content: getDisplayNameFromK8sResource(connection),
        value: getResourceNameFromK8sResource(connection),
        description: (
          <Flex direction={{ default: 'column' }} rowGap={{ default: 'rowGapNone' }}>
            {getDescriptionFromK8sResource(connection) && (
              <FlexItem>
                <Truncate content={getDescriptionFromK8sResource(connection)} />
              </FlexItem>
            )}
            <FlexItem>
              <Truncate
                content={`Type: ${
                  getConnectionTypeDisplayName(connection, connectionTypes) || 'Unknown'
                }`}
              />
            </FlexItem>
          </Flex>
        ),
        isSelected:
          !!selectedConnection &&
          getResourceNameFromK8sResource(connection) ===
            getResourceNameFromK8sResource(selectedConnection),
      })),
    [connectionTypes, projectConnections, selectedConnection],
  );
  const selectedConnectionType = React.useMemo(
    () =>
      connectionTypes.find(
        (t) => getResourceNameFromK8sResource(t) === getConnectionTypeRef(selectedConnection),
      ),
    [connectionTypes, selectedConnection],
  );

  React.useEffect(() => {
    setIsConnectionValid(
      !!selectedConnection &&
        (isUriConnection(selectedConnection) ? true : isConnectionPathValid(folderPath)),
    );
  }, [folderPath, selectedConnection, setIsConnectionValid]);

  return (
    <>
      <Popover
        aria-label="Hoverable popover"
        bodyContent="This list includes only connections that are compatible with model serving."
      >
        <Button
          style={{ paddingLeft: 0 }}
          icon={<OutlinedQuestionCircleIcon />}
          variant="link"
          disabled
        >
          Not seeing what you&apos;re looking for?
        </Button>
      </Popover>
      <FormGroup label="Connection" isRequired className="pf-v6-u-mb-lg">
        <TypeaheadSelect
          selectOptions={options}
          onSelect={(_, value) => {
            const newConnection = projectConnections.find(
              (c) => getResourceNameFromK8sResource(c) === value,
            );
            if (newConnection) {
              onSelect(newConnection);
            }
          }}
          popperProps={{ appendTo: 'inline' }}
          previewDescription={false}
        />
        {selectedConnection && (
          <ConnectionDetailsHelperText
            connection={selectedConnection}
            connectionType={selectedConnectionType}
          />
        )}
      </FormGroup>
      {selectedConnection && !isUriConnection(selectedConnection) && (
        <DataConnectionFolderPathField folderPath={folderPath} setFolderPath={setFolderPath} />
      )}
    </>
  );
};

type NewConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  setNewConnection: (connection: Connection) => void;
  setIsConnectionValid: (isValid: boolean) => void;
};

const NewConnectionField: React.FC<NewConnectionFieldProps> = ({
  connectionTypes,
  data,
  setData,
  setNewConnection,
  setIsConnectionValid,
}) => {
  const enabledConnectionTypes = React.useMemo(
    () =>
      connectionTypes.filter((t) => t.metadata.annotations?.['opendatahub.io/disabled'] !== 'true'),
    [connectionTypes],
  );
  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(
    enabledConnectionTypes.length === 1
      ? withRequiredFields(connectionTypes[0], S3ConnectionTypeKeys)
      : undefined,
  );
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();

  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(enabledConnectionTypes.length === 1 ? getDefaultValues(enabledConnectionTypes[0]) : {});

  const [validations, setValidations] = React.useState<{
    [key: string]: boolean;
  }>({});
  const isFormValid = React.useMemo(
    () =>
      !!selectedConnectionType &&
      isK8sNameDescriptionDataValid(nameDescData) &&
      !selectedConnectionType.data?.fields?.find(
        (field) =>
          isConnectionTypeDataField(field) &&
          field.required &&
          !connectionValues[field.envVar] &&
          field.type !== ConnectionTypeFieldType.Boolean,
      ) &&
      !Object.values(validations).includes(false),
    [selectedConnectionType, nameDescData, connectionValues, validations],
  );

  React.useEffect(() => {
    if (selectedConnectionType) {
      setNewConnection(
        assembleConnectionSecret(
          data.project,
          getResourceNameFromK8sResource(selectedConnectionType),
          nameDescData,
          connectionValues,
        ),
      );
    }
    setIsConnectionValid(
      isFormValid &&
        !!selectedConnectionType &&
        (isUriConnectionType(selectedConnectionType)
          ? true
          : isConnectionPathValid(data.storage.path)),
    );
  }, [
    connectionValues,
    data.project,
    data.storage.path,
    isFormValid,
    nameDescData,
    selectedConnectionType,
    setIsConnectionValid,
    setNewConnection,
  ]);

  return (
    <FormSection>
      <ConnectionTypeForm
        options={enabledConnectionTypes}
        connectionType={selectedConnectionType}
        setConnectionType={(type) => {
          setSelectedConnectionType(
            withRequiredFields(
              connectionTypes.find((t) => getResourceNameFromK8sResource(t) === type),
              S3ConnectionTypeKeys,
            ),
          );
        }}
        connectionNameDesc={nameDescData}
        setConnectionNameDesc={setNameDescData}
        connectionValues={connectionValues}
        onChange={(field, value) =>
          setConnectionValues((prev) => ({ ...prev, [field.envVar]: value }))
        }
        onValidate={(field, isValid) =>
          setValidations((prev) => ({ ...prev, [field.envVar]: isValid }))
        }
      />
      {selectedConnectionType && !isUriConnectionType(selectedConnectionType) && (
        <DataConnectionFolderPathField
          folderPath={data.storage.path}
          setFolderPath={(path) => setData('storage', { ...data.storage, path })}
        />
      )}
    </FormSection>
  );
};

type Props = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  connection: Connection | undefined;
  setConnection: (connection?: Connection) => void;
  setIsConnectionValid: (isValid: boolean) => void;
};

export const ConnectionSection: React.FC<Props> = ({
  data,
  setData,
  connection,
  setConnection,
  setIsConnectionValid,
}) => {
  const [connectionTypes] = useWatchConnectionTypes(true);
  const [projectConnections] = useConnections(data.project, true);

  const hasImagePullSecret = React.useMemo(() => !!data.imagePullSecrets, [data.imagePullSecrets]);

  const selectedConnection = React.useMemo(
    () =>
      projectConnections.find(
        (c) => getResourceNameFromK8sResource(c) === data.storage.dataConnection,
      ),
    [projectConnections, data.storage.dataConnection],
  );

  React.useEffect(() => {
    if (selectedConnection && !connection) {
      setConnection(selectedConnection);
    }
  }, [selectedConnection, connection, setConnection]);

  return (
    <>
      {data.storage.uri && !hasImagePullSecret && (
        <Radio
          id="existing-uri-radio"
          name="existing-uri-radio"
          label="Current URI"
          isChecked={data.storage.type === InferenceServiceStorageType.EXISTING_URI}
          onChange={() => {
            setConnection(undefined);
            setData('storage', {
              ...data.storage,
              type: InferenceServiceStorageType.EXISTING_URI,
              alert: undefined,
            });
          }}
          body={data.storage.type === InferenceServiceStorageType.EXISTING_URI && data.storage.uri}
        />
      )}
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
            alert: undefined,
          });
        }}
        body={
          data.storage.type === InferenceServiceStorageType.EXISTING_STORAGE && (
            <ExistingConnectionField
              connectionTypes={connectionTypes}
              projectConnections={projectConnections}
              selectedConnection={selectedConnection}
              onSelect={(selection) => {
                setConnection(selection);
                setData('storage', {
                  ...data.storage,
                  dataConnection: getResourceNameFromK8sResource(selection),
                });
              }}
              folderPath={data.storage.path}
              setFolderPath={(path) => setData('storage', { ...data.storage, path })}
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
        className="pf-v6-u-mb-lg"
        isChecked={data.storage.type === InferenceServiceStorageType.NEW_STORAGE}
        onChange={() => {
          setConnection(undefined);
          setData('storage', {
            ...data.storage,
            type: InferenceServiceStorageType.NEW_STORAGE,
            alert: undefined,
          });
        }}
        body={
          data.storage.type === InferenceServiceStorageType.NEW_STORAGE && (
            <NewConnectionField
              connectionTypes={connectionTypes}
              data={data}
              setData={setData}
              setNewConnection={setConnection}
              setIsConnectionValid={setIsConnectionValid}
            />
          )
        }
      />
    </>
  );
};
