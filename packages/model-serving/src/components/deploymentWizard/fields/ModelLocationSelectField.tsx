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
import { ModelLocationInputFields } from './ModelLocationInputFields';
import {
  isExistingModelLocation,
  ModelLocationData,
  ModelLocationType,
} from './modelLocationFields/types';

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
};
export const useModelLocationField = (
  existingData?: ModelLocationFieldData,
): ModelLocationField => {
  const [modelLocation, setModelLocation] = React.useState<ModelLocationFieldData | undefined>(
    existingData,
  );

  return {
    data: modelLocation,
    setData: setModelLocation,
  };
};

// Component

type ModelLocationSelectFieldProps = {
  modelLocation?: ModelLocationFieldData;
  setModelLocation?: (value: ModelLocationFieldData) => void;
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
  project: ProjectKind | null;
  setModelLocationData?: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
  modelLocationData?: ModelLocationData;
};
export const ModelLocationSelectField: React.FC<ModelLocationSelectFieldProps> = ({
  modelLocation,
  setModelLocation,
  validationProps,
  validationIssues = [],
  project,
  setModelLocationData,
  resetModelLocationData,
  modelLocationData,
}) => {
  const [fetchedConnections] = useServingConnections(project?.metadata.name ?? '');
  const { connections } = useLabeledConnections(undefined, fetchedConnections);
  const selectedConnection = React.useMemo(
    () =>
      modelLocation === ModelLocationType.EXISTING && isExistingModelLocation(modelLocationData)
        ? connections.find(
            (c) => getResourceNameFromK8sResource(c.connection) === modelLocationData.connection,
          )
        : undefined,
    [connections, modelLocation, modelLocationData],
  );

  const [selectedConnectionState, setSelectedConnection] = React.useState<Connection | undefined>(
    undefined,
  );

  React.useEffect(() => {
    if (selectedConnection && !selectedConnectionState) {
      setSelectedConnection(selectedConnection.connection);
    }
  }, [selectedConnection, selectedConnectionState, setSelectedConnection]);
  const [modelServingConnectionTypes] = useWatchConnectionTypes(true);

  const selectedConnectionType = React.useMemo(
    () =>
      modelServingConnectionTypes.find(
        (t) =>
          getResourceNameFromK8sResource(t) ===
          getConnectionTypeRef(selectedConnection?.connection),
      ),
    [modelServingConnectionTypes, selectedConnection],
  );
  return (
    <FormGroup fieldId="model-location-select" label="Model location" isRequired>
      <FormHelperText>
        <HelperTextItem>Where is the model you want to deploy located?</HelperTextItem>
      </FormHelperText>
      <SimpleSelect
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
          selectedConnection={selectedConnection?.connection}
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
