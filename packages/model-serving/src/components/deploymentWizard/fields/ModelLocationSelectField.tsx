import React from 'react';
import {
  Form,
  FormGroup,
  FormHelperText,
  Alert,
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
  ModelServingCompatibleTypes,
  isModelServingCompatible,
  filterEnabledConnectionTypes,
  getModelServingCompatibility,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
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

  // Filtered types for the dropdown so only enabled types are shown
  const filteredModelServingConnectionTypes = React.useMemo(() => {
    return filterEnabledConnectionTypes(modelServingConnectionTypes);
  }, [modelServingConnectionTypes]);

  const pvcs = usePvcs(projectName);
  const { selectedConnection, connections, setSelectedConnection } = useModelLocationData(
    projectName,
    modelLocationData,
  );

  const uriConnectionTypes = filteredModelServingConnectionTypes.filter((t) =>
    isModelServingCompatible(t, ModelServingCompatibleTypes.URI),
  );
  const ociConnectionTypes = filteredModelServingConnectionTypes.filter((t) =>
    isModelServingCompatible(t, ModelServingCompatibleTypes.OCI),
  );
  const s3ConnectionTypes = filteredModelServingConnectionTypes.filter((t) =>
    isModelServingCompatible(t, ModelServingCompatibleTypes.S3ObjectStorage),
  );
  const [showCustomTypeSelect, setShowCustomTypeSelect] = React.useState(false);
  const [typeOptions, setTypeOptions] = React.useState<ConnectionTypeConfigMapObj[]>([]);

  // Compute selectedKey from connectionTypeObject when available (for prefilled data)
  const computedSelectedKey = React.useMemo<{ key: string; label: string } | undefined>(() => {
    if (modelLocationData?.connectionTypeObject && modelLocation === ModelLocationType.NEW) {
      const connectionType = modelLocationData.connectionTypeObject;
      return {
        key: isModelServingCompatible(connectionType, ModelServingCompatibleTypes.S3ObjectStorage)
          ? s3Option.key
          : isModelServingCompatible(connectionType, ModelServingCompatibleTypes.OCI)
          ? ociOption.key
          : uriOption.key,
        label: isModelServingCompatible(connectionType, ModelServingCompatibleTypes.S3ObjectStorage)
          ? s3Option.label
          : isModelServingCompatible(connectionType, ModelServingCompatibleTypes.OCI)
          ? ociOption.label
          : uriOption.label,
      };
    }

    // Fallback if there is no connectionTypeObject, get the connection type from the connection
    if (modelLocationData?.connection && modelLocation !== ModelLocationType.EXISTING) {
      const connection = connections.find((c) => c.metadata.name === modelLocationData.connection);
      if (connection) {
        const compatibleType = getModelServingCompatibility(connection)[0];
        switch (compatibleType) {
          case ModelServingCompatibleTypes.S3ObjectStorage:
            return { key: s3Option.key, label: s3Option.label };
          case ModelServingCompatibleTypes.OCI:
            return { key: ociOption.key, label: ociOption.label };
          case ModelServingCompatibleTypes.URI:
            return { key: uriOption.key, label: uriOption.label };
        }
      }
    }
    return undefined;
  }, [modelLocationData?.connectionTypeObject, modelLocation, connections]);

  // State for user selections (overrides computed when user changes)
  const [userSelectedKey, setUserSelectedKey] = React.useState<
    { key: string; label: string } | undefined
  >(undefined);

  // Use user selection if available, otherwise use computed
  const selectedKey = userSelectedKey ?? computedSelectedKey;
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
  }, [
    modelLocationData?.connectionTypeObject,
    connectionTypesLoaded,
    selectedKey,
    selectedConnection,
    modelLocation,
  ]);

  const selectedConnectionType = React.useMemo(() => {
    if (modelLocationData?.connectionTypeObject) {
      return modelLocationData.connectionTypeObject;
    }
    if (selectedConnection) {
      const compatibleType = getModelServingCompatibility(selectedConnection)[0];
      switch (compatibleType) {
        case ModelServingCompatibleTypes.S3ObjectStorage:
          return s3ConnectionTypes[0];
        case ModelServingCompatibleTypes.OCI:
          return ociConnectionTypes[0];
        case ModelServingCompatibleTypes.URI:
          return uriConnectionTypes[0];
      }
    }
    return undefined;
  }, [modelLocationData, modelServingConnectionTypes, selectedConnection]);

  const baseOptions = React.useMemo(() => {
    const options: { key: string; label: string }[] = [
      ...(connections.length > 0
        ? [{ key: ModelLocationType.EXISTING, label: 'Existing connection' }]
        : []),
      ...(pvcs.data.length > 0 ? [{ key: ModelLocationType.PVC, label: 'Cluster storage' }] : []),
    ];

    // Always include the base option of the selected connection type (URI, OCI, S3) for edit prefill scenarios
    const hasS3Selected = selectedKey?.key === s3Option.key;
    const hasOCISelected = selectedKey?.key === ociOption.key;
    const hasURISelected = selectedKey?.key === uriOption.key;

    if (s3ConnectionTypes.length > 0 || hasS3Selected) {
      options.push({ key: s3Option.key, label: s3Option.label });
    }
    if (ociConnectionTypes.length > 0 || hasOCISelected) {
      options.push({ key: ociOption.key, label: ociOption.label });
    }
    if (uriConnectionTypes.length > 0 || hasURISelected) {
      options.push({ key: uriOption.key, label: uriOption.label });
    }

    return options;
  }, [
    connections.length,
    pvcs.data.length,
    s3ConnectionTypes.length,
    ociConnectionTypes.length,
    uriConnectionTypes.length,
    selectedKey?.key,
  ]);

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
        {modelLocationData?.prefillAlertText && (
          <Alert
            variant="info"
            isInline
            isPlain
            title={modelLocationData.prefillAlertText}
            data-testid="prefill-alert"
          />
        )}
        <FormGroup fieldId="model-location-select" label="Model location" isRequired>
          <FormHelperText>
            <HelperTextItem>Where is the model currently located?</HelperTextItem>
          </FormHelperText>
          <Stack hasGutter>
            <StackItem>
              <SimpleSelect
                isDisabled={modelLocationData?.disableInputFields}
                dataTestId="model-location-select"
                options={selectOptions}
                onChange={(key) => {
                  if (key === '__placeholder__') {
                    return;
                  }
                  setSelectedConnection(undefined);
                  resetModelLocationData();
                  setUserSelectedKey(undefined);
                  if (isValidModelLocation(key) && key !== ModelLocationType.NEW) {
                    setModelLocationData({
                      type: key,
                      fieldValues: {},
                      additionalFields: {},
                    });
                  } else {
                    switch (key) {
                      case s3Option.key:
                        setUserSelectedKey({ key: s3Option.key, label: s3Option.label });
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
                        setUserSelectedKey({ key: ociOption.key, label: ociOption.label });
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
                        setUserSelectedKey({ key: uriOption.key, label: uriOption.label });
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
                  connections={connections}
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
