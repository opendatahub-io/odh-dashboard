import React from 'react';
import { Flex, FlexItem, FormGroup, Stack, StackItem, Truncate } from '@patternfly/react-core';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '@odh-dashboard/internal/concepts/k8s/utils';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/internal/components/TypeaheadSelect';
import { ConnectionDetailsHelperText } from '@odh-dashboard/internal/concepts/connectionTypes/ConnectionDetailsHelperText';
import {
  getConnectionTypeDisplayName,
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import {
  Connection,
  ConnectionTypeConfigMapObj,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import ConnectionS3FolderPathField from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionS3FolderPathField';
import ConnectionOciPathField from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionOciPathField';
import { ConnectionTypeRefs, ModelLocationData, ModelLocationType } from '../../types';
import { isExistingModelLocation, resolveConnectionType } from '../../utils';

type ExistingConnectionFieldProps = {
  children?: React.ReactNode;
  connectionTypes: ConnectionTypeConfigMapObj[];
  projectConnections: Connection[];
  selectedConnection?: Connection;
  onSelect: (connection: Connection) => void;
  selectedConnectionType?: ConnectionTypeConfigMapObj;
  labelHelp?: React.ReactElement;
  setModelLocationData?: (data: ModelLocationData | undefined) => void;
  resetModelLocationData?: () => void;
  modelLocationData?: ModelLocationData;
};

export const ExistingConnectionField: React.FC<ExistingConnectionFieldProps> = ({
  children,
  connectionTypes,
  projectConnections,
  selectedConnection,
  onSelect,
  selectedConnectionType,
  labelHelp,
  setModelLocationData,
  resetModelLocationData,
  modelLocationData,
}) => {
  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      projectConnections.map((connection) => {
        const displayName = getDisplayNameFromK8sResource(connection);

        return {
          content: displayName,
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
        };
      }),
    [connectionTypes, projectConnections, selectedConnection],
  );

  return (
    <FormGroup label="Connection" isRequired className="pf-v6-u-mb-lg" labelHelp={labelHelp}>
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <TypeaheadSelect
            toggleWidth="450px"
            selectOptions={options}
            onSelect={(_, value) => {
              const alreadySelectedConnection =
                selectedConnection && getResourceNameFromK8sResource(selectedConnection) === value;
              if (alreadySelectedConnection) {
                return;
              }

              resetModelLocationData?.();

              const newConnection = projectConnections.find(
                (conn) => getResourceNameFromK8sResource(conn) === value,
              );
              if (!newConnection) return;
              onSelect(newConnection);
              const newConnectionType = resolveConnectionType(newConnection, connectionTypes);
              setModelLocationData?.({
                type: ModelLocationType.EXISTING,
                connectionTypeObject: newConnectionType,
                connection: getResourceNameFromK8sResource(newConnection),
                fieldValues: {},
                additionalFields: modelLocationData?.additionalFields ?? {},
              });
            }}
            popperProps={{ appendTo: 'inline' }}
            previewDescription={false}
          />
        </FlexItem>
        <FlexItem>
          <ConnectionDetailsHelperText
            connection={selectedConnection}
            connectionType={selectedConnectionType}
          />
        </FlexItem>
      </Flex>
      <Stack hasGutter>
        <StackItem>{children}</StackItem>
        {((selectedConnectionType &&
          isModelServingCompatible(
            selectedConnectionType,
            ModelServingCompatibleTypes.S3ObjectStorage,
          )) ||
          selectedConnectionType?.metadata.name === ConnectionTypeRefs.S3) && (
          <StackItem>
            <ConnectionS3FolderPathField
              folderPath={modelLocationData?.additionalFields.modelPath ?? ''}
              setFolderPath={(path) => {
                if (isExistingModelLocation(modelLocationData) && setModelLocationData) {
                  setModelLocationData({
                    ...modelLocationData,
                    additionalFields: { modelPath: path },
                  });
                }
              }}
            />
          </StackItem>
        )}
        {((selectedConnectionType &&
          isModelServingCompatible(selectedConnectionType, ModelServingCompatibleTypes.OCI)) ||
          selectedConnectionType?.metadata.name === ConnectionTypeRefs.OCI) && (
          <StackItem>
            <ConnectionOciPathField
              ociHost={window.atob(selectedConnection?.data?.OCI_HOST ?? '')}
              modelUri={
                isExistingModelLocation(modelLocationData)
                  ? modelLocationData.additionalFields.modelUri ?? ''
                  : ''
              }
              setModelUri={(uri) => {
                if (isExistingModelLocation(modelLocationData) && setModelLocationData) {
                  setModelLocationData({
                    ...modelLocationData,
                    additionalFields: { modelUri: uri ?? '' },
                  });
                }
              }}
            />
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};
