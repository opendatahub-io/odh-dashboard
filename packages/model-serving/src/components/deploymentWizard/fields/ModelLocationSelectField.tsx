import React from 'react';
import { FormGroup, FormHelperText, HelperTextItem } from '@patternfly/react-core';
import { z, type ZodIssue } from 'zod';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { FieldValidationProps } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { ZodErrorHelperText } from '@odh-dashboard/internal/components/ZodErrorFormHelperText';
import {
  Connection,
  ConnectionTypeConfigMapObj,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { getConnectionTypeRef } from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { LabeledConnection } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import { ModelLocationInputFields } from './ModelLocationInputFields';
import { ModelLocationData, ModelLocationType } from './modelLocationFields/types';

// Schema
export const modelLocationSelectFieldSchema = z.enum(
  [ModelLocationType.EXISTING, ModelLocationType.NEW, ModelLocationType.PVC],
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
    required_error: 'Select a model location.',
  },
);

export type ModelLocationFieldData = z.infer<typeof modelLocationSelectFieldSchema>;
export const isValidModelLocation = (value: string): value is ModelLocationFieldData =>
  value === ModelLocationType.EXISTING ||
  value === ModelLocationType.NEW ||
  value === ModelLocationType.PVC;

// Hooks
export type ModelLocationField = {
  data: ModelLocationFieldData | undefined;
  setData: (data: ModelLocationFieldData) => void;
  connections: LabeledConnection[];
  setSelectedConnection: (
    connection: LabeledConnection | undefined,
    connectionTypes: ConnectionTypeConfigMapObj[],
  ) => void;
  selectedConnection: LabeledConnection | undefined;
};
// Component

type ModelLocationSelectFieldProps = {
  modelLocation?: ModelLocationData['type'];
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
  const selectedConnectionType = React.useMemo(() => {
    if (modelLocationData?.type === ModelLocationType.NEW) {
      return modelLocationData.connectionTypeObject;
    }
    if (selectedConnectionState) {
      return modelServingConnectionTypes.find(
        (t) => getResourceNameFromK8sResource(t) === getConnectionTypeRef(selectedConnectionState),
      );
    }
    return undefined;
  }, [modelLocationData, modelServingConnectionTypes, selectedConnectionState]);
  return (
    <FormGroup fieldId="model-location-select" label="Model location" isRequired>
      <FormHelperText>
        <HelperTextItem>Where is the model you want to deploy located?</HelperTextItem>
      </FormHelperText>
      <SimpleSelect
        dataTestId="model-location-select"
        options={[
          { key: ModelLocationType.EXISTING, label: 'Existing connection' },
          { key: ModelLocationType.PVC, label: 'Cluster storage' },
          ...modelServingConnectionTypes.map((ct) => ({
            key: ct.metadata.name,
            label: ct.metadata.annotations?.['openshift.io/display-name'] || ct.metadata.name,
            value: ModelLocationType.NEW,
          })),
        ]}
        onChange={(key) => {
          if (isValidModelLocation(key)) {
            setModelLocationData({
              type: key,
              connectionTypeObject: {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                  name: '',
                  labels: {
                    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
                    'opendatahub.io/connection-type': 'true',
                  },
                },
                data: { fields: [] },
              },
              fieldValues: {},
              additionalFields: {},
            });
            setSelectedConnection(undefined);
          } else {
            const foundConnectionType = modelServingConnectionTypes.find(
              (ct) => ct.metadata.name === key,
            );

            if (foundConnectionType) {
              setModelLocationData({
                type: ModelLocationType.NEW,
                connectionTypeObject: foundConnectionType,
                fieldValues: {},
                additionalFields: {},
              });
            }
          }
        }}
        onBlur={validationProps?.onBlur}
        placeholder="Select model location"
        value={
          modelLocation === ModelLocationType.NEW && modelLocationData?.connectionTypeObject
            ? modelLocationData.connectionTypeObject.metadata.name
            : modelLocation
        }
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
