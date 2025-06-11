import * as React from 'react';
import { FormGroup, Icon, Popover, Stack, StackItem } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  HardwareProfileKind,
  HardwareProfileFeatureVisibility,
  ServingRuntimeKind,
} from '#~/k8sTypes';
import { isGpuDisabled } from '#~/pages/modelServing/screens/projects/utils';
import AcceleratorProfileSelectField from '#~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { getCompatibleIdentifiers } from '#~/pages/projects/screens/spawner/spawnerUtils';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { formatMemory } from '#~/utilities/valueUnits';
import { ModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import HardwareProfileFormSection from '#~/concepts/hardwareProfiles/HardwareProfileFormSection';
import { ModelServingSize } from '#~/pages/modelServing/screens/types';
import ServingRuntimeSizeExpandedField from './ServingRuntimeSizeExpandedField';

type ServingRuntimeSizeSectionProps = {
  podSpecOptionState: ModelServingPodSpecOptionsState;
  projectName?: string;
  servingRuntimeSelected?: ServingRuntimeKind;
  infoContent?: string;
  isEditing?: boolean;
  customDefaults?: ModelServingSize;
};

const ServingRuntimeSizeSection = ({
  podSpecOptionState,
  projectName,
  servingRuntimeSelected,
  infoContent,
  isEditing = false,
  customDefaults,
}: ServingRuntimeSizeSectionProps): React.ReactNode => {
  const isHardwareProfileEnabled = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  const gpuDisabled = servingRuntimeSelected ? isGpuDisabled(servingRuntimeSelected) : false;

  const lastEditedCustomResourcesRef = React.useRef<ModelServingSize['resources'] | undefined>(
    customDefaults?.resources,
  );

  const getLatestCustomResources = (): ModelServingSize['resources'] =>
    lastEditedCustomResourcesRef.current ||
    customDefaults?.resources || {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '1', memory: '1Gi' },
    };

  const baseSizes = podSpecOptionState.modelSize.sizes.filter(
    (size) =>
      size.resources.limits?.cpu &&
      size.resources.limits.memory &&
      size.resources.requests?.cpu &&
      size.resources.requests.memory,
  );

  const currentCustomSizeObject: ModelServingSize = {
    name: 'Custom',
    resources: getLatestCustomResources(),
  };

  const sizeCustom = [...baseSizes, currentCustomSizeObject];

  const sizeOptions = () =>
    sizeCustom.map((size): SimpleSelectOption => {
      const { name } = size;
      const desc =
        name !== 'Custom'
          ? `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
            `${formatMemory(size.resources.limits?.memory) || '??'} Memory ` +
            `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
            `${formatMemory(size.resources.requests?.memory) || '??'} Memory`
          : '';
      return { key: name, label: name, description: desc };
    });

  const isHardwareProfileSupported = React.useCallback(
    (profile: HardwareProfileKind) => {
      if (!servingRuntimeSelected) {
        return false;
      }

      const compatibleIdentifiers = getCompatibleIdentifiers(servingRuntimeSelected);

      // if any of the identifiers in the image are included in the profile, return true
      return compatibleIdentifiers.some((imageIdentifier) =>
        profile.spec.identifiers?.some(
          (profileIdentifier) => profileIdentifier.identifier === imageIdentifier,
        ),
      );
    },
    [servingRuntimeSelected],
  );

  return (
    <>
      {isHardwareProfileEnabled ? (
        <HardwareProfileFormSection
          project={projectName}
          podSpecOptionsState={podSpecOptionState}
          isEditing={isEditing}
          isHardwareProfileSupported={isHardwareProfileSupported}
          visibleIn={[HardwareProfileFeatureVisibility.MODEL_SERVING]}
        />
      ) : (
        <FormGroup
          label="Model server size"
          labelHelp={
            infoContent ? (
              <Popover bodyContent={<div>{infoContent}</div>}>
                <Icon aria-label="Model server size info" role="button">
                  <OutlinedQuestionCircleIcon />
                </Icon>
              </Popover>
            ) : undefined
          }
          fieldId="model-server-size-selection"
          isRequired
        >
          <Stack hasGutter>
            <StackItem>
              <SimpleSelect
                dataTestId="model-server-size-selection"
                isFullWidth
                options={sizeOptions()}
                value={podSpecOptionState.modelSize.selectedSize.name}
                toggleProps={{ id: 'model-server-size-selection' }}
                placeholder="Select a model server size"
                onChange={(option) => {
                  const valuesSelected = sizeCustom.find((element) => element.name === option);
                  if (valuesSelected) {
                    podSpecOptionState.modelSize.setSelectedSize(valuesSelected);
                  }
                }}
                popperProps={{ appendTo: document.body }}
              />
            </StackItem>
            {podSpecOptionState.modelSize.selectedSize.name === 'Custom' && (
              <StackItem>
                <ServingRuntimeSizeExpandedField
                  data={podSpecOptionState.modelSize.selectedSize}
                  setData={(value) => {
                    podSpecOptionState.modelSize.setSelectedSize(value);
                    if (value.name === 'Custom') {
                      lastEditedCustomResourcesRef.current = value.resources;
                    }
                  }}
                />
              </StackItem>
            )}
            {!gpuDisabled && (
              <AcceleratorProfileSelectField
                hasAdditionalPopoverInfo
                currentProject={projectName}
                initialState={podSpecOptionState.acceleratorProfile.initialState}
                compatibleIdentifiers={
                  servingRuntimeSelected ? getCompatibleIdentifiers(servingRuntimeSelected) : []
                }
                resourceDisplayName="serving runtime"
                infoContent="Ensure that appropriate tolerations are in place before adding an accelerator to your model server."
                formData={podSpecOptionState.acceleratorProfile.formData}
                setFormData={podSpecOptionState.acceleratorProfile.setFormData}
              />
            )}
          </Stack>
        </FormGroup>
      )}
    </>
  );
};

export default ServingRuntimeSizeSection;
