import * as React from 'react';
import { FormGroup, Icon, Popover, Stack, StackItem } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  HardwareProfileKind,
  HardwareProfileFeatureVisibility,
  ServingRuntimeKind,
} from '~/k8sTypes';
import { isGpuDisabled } from '~/pages/modelServing/screens/projects/utils';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { getCompatibleIdentifiers } from '~/pages/projects/screens/spawner/spawnerUtils';
import SimpleSelect from '~/components/SimpleSelect';
import { formatMemory } from '~/utilities/valueUnits';
import { ModelServingPodSpecOptionsState } from '~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import HardwareProfileFormSection from '~/concepts/hardwareProfiles/HardwareProfileFormSection';
import { ModelServingSize } from '~/pages/modelServing/screens/types';
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

  const customResources = customDefaults
    ? customDefaults.resources
    : podSpecOptionState.modelSize.sizes[0].resources;

  const sizeCustom = [
    ...podSpecOptionState.modelSize.sizes,
    {
      name: 'Custom',
      resources: customResources,
    },
  ];

  const sizeOptions = () =>
    sizeCustom.map((size) => {
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
                toggleLabel={
                  podSpecOptionState.modelSize.selectedSize.name || 'Select a model server size'
                }
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
                  setData={podSpecOptionState.modelSize.setSelectedSize}
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
