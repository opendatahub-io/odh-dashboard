import React from 'react';
import {
  FormGroup,
  FormHelperText,
  Alert,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { type ZodIssue } from 'zod';
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
  getModelServingCompatibility,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { isGeneratedSecretName } from '@odh-dashboard/internal/api/k8s/secrets';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import { ModelLocationInputFields } from './ModelLocationInputFields';
import { NIMModelLocationOption } from './modelLocationFields/NIMModelLocation';
import { useEnabledModelServingConnectionTypes } from './modelLocationFields/useEnabledConnectionTypes';
import { isModelLocationType, ModelLocationData, ModelLocationType } from '../types';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';

// Component

const s3Option = {
  key: 'S3',
  label: 'S3 object storage',
};
const ociOption = {
  key: 'OCI',
  label: 'OCI compliant registry',
};
const uriOption = {
  key: 'URI',
  label: 'URI',
};

type ModelLocationSelectFieldProps = {
  wizardState: UseModelDeploymentWizardState;
  modelLocation?: ModelLocationData['type'];
  validationProps?: FieldValidationProps;
  validationIssues?: ZodIssue[];
  setModelLocationData: (data: ModelLocationData | undefined) => void;
  resetModelLocationData: () => void;
  modelLocationData?: ModelLocationData;
  connections: Connection[];
  setSelectedConnection: (connection: Connection | undefined) => void;
  selectedConnection: Connection | undefined;
  pvcs: PersistentVolumeClaimKind[];
};
export const ModelLocationSelectField: React.FC<ModelLocationSelectFieldProps> = ({
  wizardState,
  modelLocation,
  validationProps,
  validationIssues = [],
  setModelLocationData,
  resetModelLocationData,
  modelLocationData,
  connections,
  setSelectedConnection,
  selectedConnection,
  pvcs,
}) => {
  const isNimWizardEnabled = useIsAreaAvailable(SupportedArea.NIM_WIZARD).status;

  const [modelServingConnectionTypes] = useWatchConnectionTypes(true);
  // Filtered types for the dropdown so only enabled types are shown
  const { s3ConnectionTypes, ociConnectionTypes, uriConnectionTypes } =
    useEnabledModelServingConnectionTypes(modelServingConnectionTypes);

  const [showCustomTypeSelect, setShowCustomTypeSelect] = React.useState(false);
  const [typeOptions, setTypeOptions] = React.useState<ConnectionTypeConfigMapObj[]>([]);

  // Compute selectedKey from connectionTypeObject when available (for prefilled data)
  const computeSelectedOption = React.useMemo<{ key: string; label: string } | undefined>(() => {
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
  }, [
    modelLocationData?.connectionTypeObject,
    modelLocationData?.connection,
    modelLocation,
    connections,
  ]);

  // State for user selections (overrides computed when user changes)
  const [userSelectedOption, setUserSelectedOption] = React.useState<
    { key: string; label: string } | undefined
  >(undefined);

  // Use user selection if available, otherwise use computed
  const selectedOption = userSelectedOption ?? computeSelectedOption;

  const currentKey = React.useMemo(
    () =>
      selectedOption?.key ??
      (modelLocation === ModelLocationType.PVC ||
      modelLocation === ModelLocationType.EXISTING ||
      modelLocation === NIMModelLocationOption.key
        ? modelLocation
        : undefined),
    [selectedOption, modelLocation],
  );

  // If duplicate connection types are available, show select to pick the specific type
  React.useEffect(() => {
    if (!modelLocationData?.connectionTypeObject && !selectedOption) {
      setShowCustomTypeSelect(false);
      setTypeOptions([]);
      return;
    }
    if (selectedOption) {
      if (selectedOption.key === s3Option.key && s3ConnectionTypes.length > 1) {
        setShowCustomTypeSelect(true);
        setTypeOptions(s3ConnectionTypes);
        return;
      }
      if (selectedOption.key === ociOption.key && ociConnectionTypes.length > 1) {
        setShowCustomTypeSelect(true);
        setTypeOptions(ociConnectionTypes);
        return;
      }
      if (selectedOption.key === uriOption.key && uriConnectionTypes.length > 1) {
        setShowCustomTypeSelect(true);
        setTypeOptions(uriConnectionTypes);
        return;
      }
      setShowCustomTypeSelect(false);
      setTypeOptions([]);
    } else {
      setShowCustomTypeSelect(false);
      setTypeOptions([]);
    }
  }, [
    modelLocationData?.connectionTypeObject,
    selectedOption,
    s3ConnectionTypes,
    ociConnectionTypes,
    uriConnectionTypes,
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
  }, [
    modelLocationData,
    s3ConnectionTypes,
    ociConnectionTypes,
    uriConnectionTypes,
    selectedConnection,
  ]);

  // Makes sure we don't show the existing connection option if we only have generated connections
  const nonGeneratedConnections = React.useMemo(() => {
    return connections.filter((c) => !isGeneratedSecretName(c.metadata.name));
  }, [connections]);

  const baseOptions = React.useMemo(() => {
    const options: { key: string; label: string }[] = [
      ...(nonGeneratedConnections.length > 0
        ? [{ key: ModelLocationType.EXISTING, label: 'Existing connection' }]
        : []),
      ...(pvcs.length > 0 ? [{ key: ModelLocationType.PVC, label: 'Cluster storage' }] : []),
    ];

    // Always include the base option of the selected connection type (URI, OCI, S3) for edit prefill scenarios
    const hasS3Selected = selectedOption?.key === s3Option.key;
    const hasOCISelected = selectedOption?.key === ociOption.key;
    const hasURISelected = selectedOption?.key === uriOption.key;

    if (s3ConnectionTypes.length > 0 || hasS3Selected) {
      options.push({ key: s3Option.key, label: s3Option.label });
    }
    if (ociConnectionTypes.length > 0 || hasOCISelected) {
      options.push({ key: ociOption.key, label: ociOption.label });
    }
    if (uriConnectionTypes.length > 0 || hasURISelected) {
      options.push({ key: uriOption.key, label: uriOption.label });
    }
    if (isNimWizardEnabled) {
      options.push(NIMModelLocationOption);
    }
    return options;
  }, [
    nonGeneratedConnections.length,
    pvcs.length,
    s3ConnectionTypes.length,
    ociConnectionTypes.length,
    uriConnectionTypes.length,
    selectedOption?.key,
    isNimWizardEnabled,
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
    <>
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
                if (key === currentKey) {
                  return;
                }
                setSelectedConnection(undefined);
                resetModelLocationData();
                setUserSelectedOption(undefined);
                const newOption = selectOptions.find((option) => option.key === key);
                if (newOption && isModelLocationType(key) && key !== ModelLocationType.NEW) {
                  setModelLocationData({
                    type: key,
                    fieldValues: {},
                    additionalFields: {},
                  });
                  setUserSelectedOption(newOption);
                } else {
                  switch (key) {
                    case s3Option.key:
                      setUserSelectedOption({ key: s3Option.key, label: s3Option.label });
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
                      setUserSelectedOption({ key: ociOption.key, label: ociOption.label });
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
                      setUserSelectedOption({ key: uriOption.key, label: uriOption.label });
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
              value={currentKey}
              toggleProps={{ style: { minWidth: '450px' } }}
            />
          </StackItem>
          <ZodErrorHelperText zodIssue={validationIssues} />
          {modelLocation && (
            <StackItem>
              <ModelLocationInputFields
                wizardState={wizardState}
                modelLocation={modelLocation}
                connections={connections}
                connectionTypes={modelServingConnectionTypes}
                selectedConnection={selectedConnection}
                setSelectedConnection={setSelectedConnection}
                selectedConnectionType={selectedConnectionType}
                setModelLocationData={setModelLocationData}
                resetModelLocationData={resetModelLocationData}
                modelLocationData={modelLocationData}
                pvcs={pvcs}
                showCustomTypeSelect={showCustomTypeSelect}
                customTypeOptions={typeOptions}
                customTypeKey={selectedOption?.label}
              />
            </StackItem>
          )}
        </Stack>
      </FormGroup>
    </>
  );
};
