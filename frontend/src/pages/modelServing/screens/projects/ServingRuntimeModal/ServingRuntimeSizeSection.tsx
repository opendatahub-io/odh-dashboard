import * as React from 'react';
import { FormGroup, FormSection, Select, SelectOption } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingServingRuntimeObject, ServingRuntimeSize } from '../../types';
import ServingRuntimeSizeExpandedField from './ServingRuntimeSizeExpandedField';

type ServingRuntimeSizeSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  sizes: ServingRuntimeSize[];
};

const ServingRuntimeSizeSection: React.FC<ServingRuntimeSizeSectionProps> = ({
  data,
  setData,
  sizes,
}) => {
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState(false);

  // Leaving this to enable GPU in next release
  // const onChangeGPU = (event: React.FormEvent<HTMLInputElement>) => {
  //   const target = event.target as HTMLInputElement;
  //   setData('gpus', parseInt(target.value));
  // };

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
        <Select
          removeFindDomNode
          id="model-server-size-selection"
          isOpen={sizeDropdownOpen}
          placeholderText="Select a model server size"
          onToggle={(open) => setSizeDropdownOpen(open)}
          onSelect={(_, option) => {
            const valuesSelected = sizeCustom.find((element) => element.name === option);
            if (valuesSelected) {
              setData('modelSize', valuesSelected);
            }
            setSizeDropdownOpen(false);
          }}
          selections={data.modelSize.name}
        >
          {sizeOptions()}
        </Select>
        {data.modelSize.name === 'Custom' && (
          <ServingRuntimeSizeExpandedField data={data} setData={setData} />
        )}
      </FormGroup>
      {/* // Leaving this to enable GPU in next release <FormGroup label="Number of GPUs (Not implemented)">
        <NumberInput
          isDisabled
          value={data.gpus}
          widthChars={10}
          min={0}
          onChange={onChangeGPU}
          onMinus={() => setData('gpus', data.gpus - 1)}
          onPlus={() => setData('gpus', data.gpus + 1)}
        />
      </FormGroup> */}
    </FormSection>
  );
};

export default ServingRuntimeSizeSection;
