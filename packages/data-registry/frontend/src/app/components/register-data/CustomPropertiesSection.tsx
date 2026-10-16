import React from 'react';
import { Button, Content, Flex, FlexItem, FormGroup, TextInput } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';

const CustomPropertiesSection: React.FC = () => {
  const { control, register } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customProperties' });

  const content = (
    <FormGroup label="Key-value pairs" fieldId="data-custom-properties" isStack>
      <Content component="p">Optionally define custom properties using key-value pairs.</Content>
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
        className="odh-data-registry-registration-form__add-custom-property"
        onClick={() => append({ id: Date.now(), key: '', value: '' })}
        data-testid="data-add-custom-property"
      >
        Add key-value pair
      </Button>
    </FormGroup>
  );

  return content;
};

export default CustomPropertiesSection;
