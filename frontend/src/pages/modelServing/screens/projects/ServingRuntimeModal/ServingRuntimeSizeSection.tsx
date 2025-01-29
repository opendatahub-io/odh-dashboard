import * as React from 'react';
import { FormGroup, Stack, StackItem, Popover, Icon } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingModelServingObjectCommon,
  ModelServingSize,
} from '~/pages/modelServing/screens/types';
import { ServingRuntimeKind } from '~/k8sTypes';
import { isGpuDisabled } from '~/pages/modelServing/screens/projects/utils';
import AcceleratorProfileSelectField from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
import { getCompatibleAcceleratorIdentifiers } from '~/pages/projects/screens/spawner/spawnerUtils';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';
import SimpleSelect from '~/components/SimpleSelect';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';
import { formatMemory } from '~/utilities/valueUnits';
import ServingRuntimeSizeExpandedField from './ServingRuntimeSizeExpandedField';

type ServingRuntimeSizeSectionProps<D extends CreatingModelServingObjectCommon> = {
  data: D;
  setData: UpdateObjectAtPropAndValue<D>;
  sizes: ModelServingSize[];
  servingRuntimeSelected?: ServingRuntimeKind;
  acceleratorProfileState: AcceleratorProfileState;
  selectedAcceleratorProfile: AcceleratorProfileFormData;
  setSelectedAcceleratorProfile: UpdateObjectAtPropAndValue<AcceleratorProfileFormData>;
  infoContent?: string;
};

const ServingRuntimeSizeSection = <D extends CreatingModelServingObjectCommon>({
  data,
  setData,
  sizes,
  servingRuntimeSelected,
  acceleratorProfileState,
  selectedAcceleratorProfile,
  setSelectedAcceleratorProfile,
  infoContent,
}: ServingRuntimeSizeSectionProps<D>): React.ReactNode => {
  const [supportedAcceleratorProfiles, setSupportedAcceleratorProfiles] = React.useState<
    string[] | undefined
  >();

  React.useEffect(() => {
    if (servingRuntimeSelected) {
      setSupportedAcceleratorProfiles(getCompatibleAcceleratorIdentifiers(servingRuntimeSelected));
    } else {
      setSupportedAcceleratorProfiles(undefined);
    }
  }, [servingRuntimeSelected]);

  const gpuDisabled = servingRuntimeSelected ? isGpuDisabled(servingRuntimeSelected) : false;
  const sizeCustom = [
    ...sizes,
    {
      name: 'Custom',
      resources: sizes[0].resources,
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

  return (
    <>
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
              value={data.modelSize.name}
              toggleProps={{ id: 'model-server-size-selection' }}
              toggleLabel={data.modelSize.name || 'Select a model server size'}
              onChange={(option) => {
                const valuesSelected = sizeCustom.find((element) => element.name === option);
                if (valuesSelected) {
                  setData('modelSize', valuesSelected);
                }
              }}
              popperProps={{ appendTo: document.body }}
            />
          </StackItem>
          {data.modelSize.name === 'Custom' && (
            <StackItem>
              <ServingRuntimeSizeExpandedField data={data} setData={setData} />
            </StackItem>
          )}
        </Stack>
      </FormGroup>
      {!gpuDisabled && (
        <AcceleratorProfileSelectField
          initialState={acceleratorProfileState}
          supportedAcceleratorProfiles={supportedAcceleratorProfiles}
          resourceDisplayName="serving runtime"
          infoContent="Ensure that appropriate tolerations are in place before adding an accelerator to your model server."
          formData={selectedAcceleratorProfile}
          setFormData={setSelectedAcceleratorProfile}
        />
      )}
    </>
  );
};

export default ServingRuntimeSizeSection;
