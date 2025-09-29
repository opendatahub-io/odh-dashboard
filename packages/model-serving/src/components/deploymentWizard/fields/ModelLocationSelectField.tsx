import React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
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
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import usePvcs from '@odh-dashboard/internal/pages/modelServing/usePvcs';
import { ModelLocationInputFields, useModelLocationData } from './ModelLocationInputFields';
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
  connections: Connection[];
  setSelectedConnection: (
    connection: Connection | undefined,
    connectionTypes: ConnectionTypeConfigMapObj[],
  ) => void;
  selectedConnection: Connection | undefined;
};
// Component

type ModelLocationSelectFieldProps = {
  modelLocation?: ModelLocationData['type'];
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
  project: ProjectKind | null;
  setModelLocationData: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
  modelLocationData?: ModelLocationData;
};
export const ModelLocationSelectField: React.FC<ModelLocationSelectFieldProps> = ({
  modelLocation,
  validationProps,
  validationIssues = [],
  project,
  setModelLocationData,
  resetModelLocationData,
  modelLocationData,
}) => {
  const [modelServingConnectionTypes] = useWatchConnectionTypes(true);
  const pvcs = usePvcs(project?.metadata.name ?? '');
  const { selectedConnection, connections, setSelectedConnection } = useModelLocationData(
    project,
    modelLocationData,
  );

  const selectedConnectionType = React.useMemo(() => {
    if (modelLocationData?.type === ModelLocationType.NEW) {
      return modelLocationData.connectionTypeObject;
    }
    if (selectedConnection) {
      return modelServingConnectionTypes.find(
        (t) => getResourceNameFromK8sResource(t) === getConnectionTypeRef(selectedConnection),
      );
    }
    return undefined;
  }, [modelLocationData, modelServingConnectionTypes, selectedConnection]);

  const baseOptions = React.useMemo(
    () => [
      ...(connections.length > 0
        ? [{ key: ModelLocationType.EXISTING, label: 'Existing connection' }]
        : []),
      ...(pvcs.data.length > 0 ? [{ key: ModelLocationType.PVC, label: 'Cluster storage' }] : []),
      ...modelServingConnectionTypes.map((ct) => ({
        key: ct.metadata.name,
        label: ct.metadata.annotations?.['openshift.io/display-name'] || ct.metadata.name,
        value: ModelLocationType.NEW,
      })),
    ],
    [connections.length, pvcs.data.length, modelServingConnectionTypes],
  );

  const selectOptions = React.useMemo(() => {
    if (baseOptions.length <= 1) {
      // Placeholder to avoid auto selecting as different options load in (doesn't actually show in the dropdown)
      return [
        {
          key: '__placeholder__',
          label: 'Select model location',
          isPlaceholder: true,
          isDisabled: true,
          optionKey: '__placeholder__',
        },
        ...baseOptions,
      ];
    }
    return baseOptions;
  }, [baseOptions]);
  return (
    <FormGroup fieldId="model-location-select" label="Model location" isRequired>
      <FormHelperText>
        <HelperTextItem>Where is the model you want to deploy located?</HelperTextItem>
      </FormHelperText>
      <Stack hasGutter>
        <StackItem>
          <SimpleSelect
            dataTestId="model-location-select"
            options={selectOptions}
            onChange={(key) => {
              if (key === '__placeholder__') {
                return;
              }
              setSelectedConnection(undefined);
              resetModelLocationData();
              if (isValidModelLocation(key)) {
                setModelLocationData({
                  type: key,
                  fieldValues: {},
                  additionalFields: {},
                });
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
        </StackItem>
        <ZodErrorHelperText zodIssue={validationIssues} />
        {modelLocation && (
          <StackItem>
            <ModelLocationInputFields
              modelLocation={modelLocation}
              connections={connections}
              connectionTypes={modelServingConnectionTypes}
              selectedConnection={selectedConnection}
              setSelectedConnection={setSelectedConnection}
              selectedConnectionType={selectedConnectionType}
              setModelLocationData={setModelLocationData}
              resetModelLocationData={resetModelLocationData}
              modelLocationData={modelLocationData}
              pvcs={pvcs.data}
            />
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};
