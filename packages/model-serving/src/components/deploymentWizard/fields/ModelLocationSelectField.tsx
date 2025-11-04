import React from 'react';
import {
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
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
import {
  getConnectionTypeRef,
  ModelServingCompatibleTypes,
  isModelServingCompatible,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { getResourceNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import usePvcs from '@odh-dashboard/internal/pages/modelServing/usePvcs';
import { ModelLocationInputFields, useModelLocationData } from './ModelLocationInputFields';
import { ModelLocationData, ModelLocationType } from '../types';

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
  projectName?: string;
  setModelLocationData: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
  modelLocationData?: ModelLocationData;
};
export const ModelLocationSelectField: React.FC<ModelLocationSelectFieldProps> = ({
  modelLocation,
  validationProps,
  validationIssues = [],
  projectName,
  setModelLocationData,
  resetModelLocationData,
  modelLocationData,
}) => {
  const s3Option = {
    key: 'S3',
    label: 'S3 object storage',
    value: ModelLocationType.NEW,
  };
  const ociOption = {
    key: 'OCI',
    label: 'OCI compliant registry',
    value: ModelLocationType.NEW,
  };
  const uriOption = {
    key: 'URI',
    label: 'URI',
    value: ModelLocationType.NEW,
  };
  const [modelServingConnectionTypes, connectionTypesLoaded] = useWatchConnectionTypes(true);
  const pvcs = usePvcs(projectName);
  const { selectedConnection, connections, setSelectedConnection } = useModelLocationData(
    projectName,
    modelLocationData,
  );
  const filteredConnections = React.useMemo(() => {
    return connections.filter((c) => c.metadata.labels['opendatahub.io/dashboard'] === 'true');
  }, [connections]);

  const uriConnectionTypes = modelServingConnectionTypes.filter((t) =>
    isModelServingCompatible(t, ModelServingCompatibleTypes.URI),
  );
  const ociConnectionTypes = modelServingConnectionTypes.filter((t) =>
    isModelServingCompatible(t, ModelServingCompatibleTypes.OCI),
  );
  const s3ConnectionTypes = modelServingConnectionTypes.filter((t) =>
    isModelServingCompatible(t, ModelServingCompatibleTypes.S3ObjectStorage),
  );
  const [showCustomTypeSelect, setShowCustomTypeSelect] = React.useState(false);
  const [typeOptions, setTypeOptions] = React.useState<ConnectionTypeConfigMapObj[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<{ key: string; label: string } | undefined>(
    modelLocationData?.connectionTypeObject
      ? {
          key: isModelServingCompatible(
            modelLocationData.connectionTypeObject,
            ModelServingCompatibleTypes.S3ObjectStorage,
          )
            ? s3Option.key
            : isModelServingCompatible(
                modelLocationData.connectionTypeObject,
                ModelServingCompatibleTypes.OCI,
              )
            ? ociOption.key
            : uriOption.key,
          label: isModelServingCompatible(
            modelLocationData.connectionTypeObject,
            ModelServingCompatibleTypes.S3ObjectStorage,
          )
            ? s3Option.label
            : isModelServingCompatible(
                modelLocationData.connectionTypeObject,
                ModelServingCompatibleTypes.OCI,
              )
            ? ociOption.label
            : uriOption.label,
        }
      : undefined,
  );
  React.useEffect(() => {
    if (!modelLocationData?.connectionTypeObject && !selectedKey) {
      setShowCustomTypeSelect(false);
      setTypeOptions([]);
      return;
    }
    if (selectedKey) {
      if (selectedKey.key === s3Option.key && s3ConnectionTypes.length > 1) {
        setShowCustomTypeSelect(true);
        setTypeOptions(s3ConnectionTypes);
        return;
      }
      if (selectedKey.key === ociOption.key && ociConnectionTypes.length > 1) {
        setShowCustomTypeSelect(true);
        setTypeOptions(ociConnectionTypes);
        return;
      }
      if (selectedKey.key === uriOption.key && uriConnectionTypes.length > 1) {
        setShowCustomTypeSelect(true);
        setTypeOptions(uriConnectionTypes);
      }
    } else {
      setShowCustomTypeSelect(false);
      setTypeOptions([]);
    }
  }, [modelLocationData?.connectionTypeObject, connectionTypesLoaded]);

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
      ...(s3ConnectionTypes.length > 0 ? [s3Option] : []),
      ...(ociConnectionTypes.length > 0 ? [ociOption] : []),
      ...(uriConnectionTypes.length > 0 ? [uriOption] : []),
    ],
    [
      connections.length,
      pvcs.data.length,
      s3ConnectionTypes.length,
      ociConnectionTypes.length,
      uriConnectionTypes.length,
    ],
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
    <Form>
      <FormSection title="Model details">
        <p style={{ marginTop: '-8px' }}>Provide information about the model you want to deploy.</p>
        <FormGroup fieldId="model-location-select" label="Model location" isRequired>
          <FormHelperText>
            <HelperTextItem>Where is the model currently located?</HelperTextItem>
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
                  setSelectedKey(undefined);
                  if (isValidModelLocation(key) && key !== ModelLocationType.NEW) {
                    setModelLocationData({
                      type: key,
                      fieldValues: {},
                      additionalFields: {},
                    });
                  } else {
                    switch (key) {
                      case s3Option.key:
                        setSelectedKey({ key: s3Option.key, label: s3Option.label });
                        if (s3ConnectionTypes.length > 1) {
                          setShowCustomTypeSelect(true);
                          setTypeOptions(s3ConnectionTypes);
                          setModelLocationData({
                            type: ModelLocationType.NEW,
                            connectionTypeObject: undefined,
                            fieldValues: {},
                            additionalFields: {},
                          });
                        } else {
                          setShowCustomTypeSelect(false);
                          setModelLocationData({
                            type: ModelLocationType.NEW,
                            connectionTypeObject: s3ConnectionTypes[0],
                            fieldValues: {},
                            additionalFields: {},
                          });
                        }
                        break;
                      case ociOption.key:
                        setSelectedKey({ key: ociOption.key, label: ociOption.label });
                        if (ociConnectionTypes.length > 1) {
                          setShowCustomTypeSelect(true);
                          setTypeOptions(ociConnectionTypes);
                          setModelLocationData({
                            type: ModelLocationType.NEW,
                            connectionTypeObject: undefined,
                            fieldValues: {},
                            additionalFields: {},
                          });
                        } else {
                          setShowCustomTypeSelect(false);
                          setModelLocationData({
                            type: ModelLocationType.NEW,
                            connectionTypeObject: ociConnectionTypes[0],
                            fieldValues: {},
                            additionalFields: {},
                          });
                        }
                        break;
                      case uriOption.key:
                        setSelectedKey({ key: uriOption.key, label: uriOption.label });
                        if (uriConnectionTypes.length > 1) {
                          setShowCustomTypeSelect(true);
                          setTypeOptions(uriConnectionTypes);
                          setModelLocationData({
                            type: ModelLocationType.NEW,
                            connectionTypeObject: undefined,
                            fieldValues: {},
                            additionalFields: {},
                          });
                        } else {
                          setShowCustomTypeSelect(false);
                          setModelLocationData({
                            type: ModelLocationType.NEW,
                            connectionTypeObject: uriConnectionTypes[0],
                            fieldValues: {},
                            additionalFields: {},
                          });
                        }
                        break;
                    }
                  }
                }}
                onBlur={validationProps?.onBlur}
                placeholder="Select model location"
                value={
                  selectedKey?.key ??
                  (modelLocation === ModelLocationType.PVC ||
                  modelLocation === ModelLocationType.EXISTING
                    ? modelLocation
                    : undefined)
                }
                toggleProps={{ style: { minWidth: '450px' } }}
              />
            </StackItem>
            <ZodErrorHelperText zodIssue={validationIssues} />
            {modelLocation && (
              <StackItem>
                <ModelLocationInputFields
                  modelLocation={modelLocation}
                  connections={filteredConnections}
                  connectionTypes={modelServingConnectionTypes}
                  selectedConnection={selectedConnection}
                  setSelectedConnection={setSelectedConnection}
                  selectedConnectionType={selectedConnectionType}
                  setModelLocationData={setModelLocationData}
                  resetModelLocationData={resetModelLocationData}
                  modelLocationData={modelLocationData}
                  pvcs={pvcs.data}
                  showCustomTypeSelect={showCustomTypeSelect}
                  customTypeOptions={typeOptions}
                  customTypeKey={selectedKey?.label}
                />
              </StackItem>
            )}
          </Stack>
        </FormGroup>
      </FormSection>
    </Form>
  );
};
