import React from 'react';
import { FormGroup, FormHelperText, HelperTextItem } from '@patternfly/react-core';
import { z, type ZodIssue } from 'zod';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { FieldValidationProps } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { ZodErrorHelperText } from '@odh-dashboard/internal/components/ZodErrorFormHelperText';
import useServingConnections from '@odh-dashboard/internal/pages/projects/screens/detail/connections/useServingConnections';
import useLabeledConnections from '@odh-dashboard/internal/pages/modelServing/screens/projects/useLabeledConnections';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { getConnectionTypeRef } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { ModelLocationInputFields } from './ModelLocationInputFields';
import { ModelLocationData, ModelLocationType } from './modelLocationFields/types';
import { isExistingModelLocation, mapStringToConnectionType } from '../utils';

// Schema
export const modelLocationSelectFieldSchema = z.enum(
  [
    ModelLocationType.EXISTING,
    ModelLocationType.URI,
    ModelLocationType.OCI,
    ModelLocationType.PVC,
    ModelLocationType.S3,
  ],
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
    required_error: 'Select a model location.',
  },
);

export type ModelLocationFieldData = z.infer<typeof modelLocationSelectFieldSchema>;
export const isValidModelLocation = (value: string): value is ModelLocationFieldData =>
  value === ModelLocationType.EXISTING ||
  value === ModelLocationType.URI ||
  value === ModelLocationType.OCI ||
  value === ModelLocationType.PVC ||
  value === ModelLocationType.S3;

// Hooks
export type ModelLocationField = {
  data: ModelLocationFieldData | undefined;
  setData: (data: ModelLocationFieldData) => void;
  connections: LabeledConnection[];
  setSelectedConnection: (connection: LabeledConnection | undefined) => void;
  selectedConnection: LabeledConnection | undefined;
};
export const useModelLocationField = (
  project: ProjectKind | null,
  modelLocationData?: ModelLocationData,
  existingData?: ModelLocationFieldData,
  setModelLocationData?: (data: ModelLocationData | undefined) => void,
): ModelLocationField => {
  const [modelLocation, setModelLocation] = React.useState<ModelLocationFieldData | undefined>(
    existingData,
  );
  const [fetchedConnections] = useServingConnections(project?.metadata.name ?? '');
  const { connections } = useLabeledConnections(undefined, fetchedConnections);
  const selectedConnection = React.useMemo(() => {
    if (
      modelLocation === ModelLocationType.EXISTING &&
      isExistingModelLocation(modelLocationData)
    ) {
      return connections.find(
        (c) => getResourceNameFromK8sResource(c.connection) === modelLocationData.connection,
      );
    }
    return undefined;
  }, [connections, modelLocation, modelLocationData]);
  const updateSelectedConnection = React.useCallback(
    (connection: LabeledConnection | undefined) => {
      if (connection && setModelLocationData) {
        setModelLocationData({
          type: ModelLocationType.EXISTING,
          connectionType: mapStringToConnectionType(
            getConnectionTypeRef(connection.connection) ?? '',
          ),
          connection: getResourceNameFromK8sResource(connection.connection),
        });
      }
    },
    [setModelLocationData],
  );
  return {
    data: modelLocation,
    setData: setModelLocation,
    connections,
    setSelectedConnection: updateSelectedConnection,
    selectedConnection,
  };
};

// Component

type ModelLocationSelectFieldProps = {
  modelLocation?: ModelLocationFieldData;
  setModelLocation?: (value: ModelLocationFieldData) => void;
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
  connections: LabeledConnection[];
  setModelLocationData: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
  modelLocationData?: ModelLocationData;
  initSelectedConnection: LabeledConnection | undefined;
};
export const ModelLocationSelectField: React.FC<ModelLocationSelectFieldProps> = ({
  modelLocation,
  setModelLocation,
  validationProps,
  validationIssues = [],
  connections,
  setModelLocationData,
  resetModelLocationData,
  modelLocationData,
  initSelectedConnection,
}) => {
  const [selectedConnectionState, setSelectedConnection] = React.useState<Connection | undefined>(
    initSelectedConnection?.connection ?? undefined,
  );
  const [modelServingConnectionTypes] = useWatchConnectionTypes(true);

  const selectedConnectionType = React.useMemo(
    () =>
      modelServingConnectionTypes.find(
        (t) => getResourceNameFromK8sResource(t) === getConnectionTypeRef(selectedConnectionState),
      ),
    [modelServingConnectionTypes, selectedConnectionState],
  );
  return (
    <FormGroup fieldId="model-location-select" label="Model location" isRequired>
      <FormHelperText>
        <HelperTextItem>Where is the model you want to deploy located?</HelperTextItem>
      </FormHelperText>
      <SimpleSelect
        dataTestId="model-location-select"
        options={[
          {
            key: ModelLocationType.EXISTING,
            label: 'Existing connection',
          },
          {
            key: ModelLocationType.URI,
            label: 'URI',
          },
          {
            key: ModelLocationType.OCI,
            label: 'OCI compliant registry',
          },
          {
            key: ModelLocationType.PVC,
            label: 'Cluster storage',
          },
          {
            key: ModelLocationType.S3,
            label: 'S3 object storage',
          },
        ]}
        onChange={(key) => {
          if (isValidModelLocation(key)) {
            setModelLocation?.(key);
            resetModelLocationData();
            setSelectedConnection(undefined);
          }
        }}
        onBlur={validationProps?.onBlur}
        placeholder="Select model location"
        value={modelLocation}
        toggleProps={{ style: { minWidth: '450px' } }}
      />
      <ZodErrorHelperText zodIssue={validationIssues} />
      {modelLocation && (
        <ModelLocationInputFields
          modelLocation={modelLocation}
          connections={connections}
          connectionTypes={modelServingConnectionTypes}
          selectedConnection={selectedConnectionState}
          setSelectedConnection={setSelectedConnection}
          selectedConnectionType={selectedConnectionType}
          setModelLocationData={setModelLocationData}
          resetModelLocationData={resetModelLocationData}
          modelLocationData={modelLocationData}
        />
      )}
    </FormGroup>
  );
};
