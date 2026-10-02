import React from 'react';
import { FormGroup, TextInput, Button, Content, Flex, FlexItem } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';

type CustomPropertiesSectionProps = {
  description?: string;
};

const CustomPropertiesSection: React.FC<CustomPropertiesSectionProps> = ({
  description = 'Add key/value pair annotations to attach metadata to this asset.',
}) => {
  const { control, register } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customProperties' });

  const content = (
    <FormGroup fieldId="data-custom-properties">
      <Content component="p">{description}</Content>
      {fields.map((field, index) => (
        <Flex key={field.id} gap={{ default: 'gapMd' }} className="pf-v6-u-mb-xs">
          <FlexItem grow={{ default: 'grow' }}>
            <TextInput
              {...register(`customProperties.${index}.key`)}
              placeholder="Key"
              data-testid={`data-custom-property-key-${index}`}
            />
          </FlexItem>
          <FlexItem grow={{ default: 'grow' }}>
            <TextInput
              {...register(`customProperties.${index}.value`)}
              placeholder="Value"
              data-testid={`data-custom-property-value-${index}`}
            />
          </FlexItem>
          <FlexItem>
            <Button
              variant="plain"
              onClick={() => remove(index)}
              aria-label="Remove property"
              data-testid={`data-custom-property-remove-${index}`}
            >
              <MinusCircleIcon />
            </Button>
          </FlexItem>
        </Flex>
      ))}
      <Button
        variant="link"
        icon={<PlusCircleIcon />}
        onClick={() => append({ id: Date.now(), key: '', value: '' })}
        data-testid="data-add-custom-property"
      >
        Add key/value pair
      </Button>
    </FormGroup>
  );

  return content;
};

export default CustomPropertiesSection;
