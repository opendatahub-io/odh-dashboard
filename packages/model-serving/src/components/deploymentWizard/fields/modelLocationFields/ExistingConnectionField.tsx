import React from 'react';
import { Flex, FlexItem, FormGroup, Label, Truncate } from '@patternfly/react-core';
import { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
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
  getConnectionTypeRef,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import {
  Connection,
  ConnectionTypeConfigMapObj,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import ConnectionS3FolderPathField from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionS3FolderPathField';
import ConnectionOciPathField from '@odh-dashboard/internal/pages/modelServing/screens/projects/InferenceServiceModal/ConnectionOciPathField';
import { ConnectionTypeRefs, ModelLocationData, ModelLocationType } from './types';
import { isExistingModelLocation } from '../../utils';

type ExistingConnectionFieldProps = {
  children: React.ReactNode;
  connectionTypes: ConnectionTypeConfigMapObj[];
  projectConnections: LabeledConnection[];
  selectedConnection?: Connection;
  onSelect: (connection: Connection) => void;
  selectedConnectionType?: ConnectionTypeConfigMapObj;
  labelHelp?: React.ReactElement;
  setModelLocationData?: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
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
        const { isRecommended } = connection;
        const displayName = getDisplayNameFromK8sResource(connection.connection);

        return {
          content: displayName,
          value: getResourceNameFromK8sResource(connection.connection),
          dropdownLabel: (
            <>
              {isRecommended && (
                <Label color="blue" isCompact>
                  Recommended
                </Label>
              )}
            </>
          ),
          description: (
            <Flex direction={{ default: 'column' }} rowGap={{ default: 'rowGapNone' }}>
              {getDescriptionFromK8sResource(connection.connection) && (
                <FlexItem>
                  <Truncate content={getDescriptionFromK8sResource(connection.connection)} />
                </FlexItem>
              )}
              <FlexItem>
                <Truncate
                  content={`Type: ${
                    getConnectionTypeDisplayName(connection.connection, connectionTypes) ||
                    'Unknown'
                  }`}
                />
              </FlexItem>
            </Flex>
          ),
          isSelected:
            !!selectedConnection &&
            getResourceNameFromK8sResource(connection.connection) ===
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
              if (modelLocationData) {
                resetModelLocationData();
              }

              const newConnection = projectConnections.find(
                (conn) => getResourceNameFromK8sResource(conn.connection) === value,
              )?.connection;
              if (!newConnection) return;
              onSelect(newConnection);
              const newConnectionType = connectionTypes.find(
                (ct) => ct.metadata.name === getConnectionTypeRef(newConnection),
              );
              if (newConnectionType?.metadata.name === ConnectionTypeRefs.S3) {
                setModelLocationData?.({
                  type: ModelLocationType.EXISTING,
                  connection: getResourceNameFromK8sResource(newConnection),
                  connectionType: newConnectionType.metadata.name,
                  modelPath: newConnection.data?.AWS_S3_FOLDER_PATH ?? '',
                });
              }
              if (newConnectionType?.metadata.name === ConnectionTypeRefs.OCI) {
                setModelLocationData?.({
                  type: ModelLocationType.EXISTING,
                  connection: getResourceNameFromK8sResource(newConnection),
                  connectionType: newConnectionType.metadata.name,
                  modelUri: newConnection.data?.OCI_MODEL_URI ?? '',
                });
              }
              if (newConnectionType?.metadata.name === ConnectionTypeRefs.URI) {
                setModelLocationData?.({
                  type: ModelLocationType.EXISTING,
                  connection: getResourceNameFromK8sResource(newConnection),
                  connectionType: newConnectionType.metadata.name,
                  // Decode the URI
                  modelUri: window.atob(newConnection.data?.URI ?? ''),
                });
              }
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
      {children}
      {selectedConnectionType?.metadata.name === ConnectionTypeRefs.S3 && (
        <ConnectionS3FolderPathField
          folderPath={
            isExistingModelLocation(modelLocationData) ? modelLocationData.modelPath ?? '' : ''
          }
          setFolderPath={(path) => {
            if (isExistingModelLocation(modelLocationData) && setModelLocationData) {
              setModelLocationData({ ...modelLocationData, modelPath: path });
            }
          }}
        />
      )}
      {selectedConnectionType?.metadata.name === ConnectionTypeRefs.OCI && (
        <ConnectionOciPathField
          ociHost={window.atob(selectedConnection?.data?.OCI_HOST ?? '')}
          modelUri={isExistingModelLocation(modelLocationData) ? modelLocationData.modelUri : ''}
          setModelUri={(uri) => {
            if (isExistingModelLocation(modelLocationData) && setModelLocationData) {
              setModelLocationData({ ...modelLocationData, modelUri: uri ?? '' });
            }
          }}
        />
      )}
    </FormGroup>
  );
};
