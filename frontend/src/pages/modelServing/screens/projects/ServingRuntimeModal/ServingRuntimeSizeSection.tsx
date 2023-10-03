import * as React from 'react';
import { FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingServingRuntimeObject,
  ServingRuntimeSize,
} from '~/pages/modelServing/screens/types';
import { ServingRuntimeKind } from '~/k8sTypes';
import { isGpuDisabled } from '~/pages/modelServing/screens/projects/utils';
import AcceleratorSelectField from '~/pages/notebookController/screens/server/AcceleratorSelectField';
import { getCompatibleAcceleratorIdentifiers } from '~/pages/projects/screens/spawner/spawnerUtils';
import { AcceleratorState } from '~/utilities/useAcceleratorState';
import ServingRuntimeSizeExpandedField from './ServingRuntimeSizeExpandedField';

type ServingRuntimeSizeSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  sizes: ServingRuntimeSize[];
  servingRuntimeSelected?: ServingRuntimeKind;
  acceleratorState: AcceleratorState;
  setAcceleratorState: UpdateObjectAtPropAndValue<AcceleratorState>;
};

const ServingRuntimeSizeSection: React.FC<ServingRuntimeSizeSectionProps> = ({
  data,
  setData,
  sizes,
  servingRuntimeSelected,
  acceleratorState,
  setAcceleratorState,
}) => {
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState(false);
  const [supportedAccelerators, setSupportedAccelerators] = React.useState<string[] | undefined>();

  React.useEffect(() => {
    if (servingRuntimeSelected) {
      setSupportedAccelerators(getCompatibleAcceleratorIdentifiers(servingRuntimeSelected));
    } else {
      setSupportedAccelerators(undefined);
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
      const name = size.name;
      const desc =
        name !== 'Custom'
          ? `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
            `${size.resources.limits?.memory || '??'} Memory ` +
            `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
            `${size.resources.requests?.memory || '??'} Memory`
          : '';
      return <SelectOption key={name} value={name} description={desc} />;
    });

  return (
    <FormSection title="Compute resources per replica">
      <FormGroup label="Model server size">
        <Stack hasGutter>
          <StackItem>
            <Select
              id="model-server-size-selection"
              isOpen={sizeDropdownOpen}
              placeholderText="Select a model server size"
              onToggle={(e, open) => setSizeDropdownOpen(open)}
              onSelect={(_, option) => {
                const valuesSelected = sizeCustom.find((element) => element.name === option);
                if (valuesSelected) {
                  setData('modelSize', valuesSelected);
                }
                setSizeDropdownOpen(false);
              }}
              selections={data.modelSize.name}
              menuAppendTo={() => document.body}
            >
              {sizeOptions()}
            </Select>
          </StackItem>
          {data.modelSize.name === 'Custom' && (
            <StackItem>
              <ServingRuntimeSizeExpandedField data={data} setData={setData} />
            </StackItem>
          )}
        </Stack>
      </FormGroup>
      {!gpuDisabled && (
        <FormGroup>
          <AcceleratorSelectField
            acceleratorState={acceleratorState}
            setAcceleratorState={setAcceleratorState}
            supportedAccelerators={supportedAccelerators}
            resourceDisplayName="serving runtime"
          />
        </FormGroup>
      )}
    </FormSection>
  );
};

export default ServingRuntimeSizeSection;
