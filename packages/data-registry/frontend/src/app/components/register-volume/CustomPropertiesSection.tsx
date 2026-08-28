import React from 'react';
import {
  FormGroup,
  FormSection,
  TextInput,
  Button,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { RegisterVolumeFormData } from '~/app/schemas/registerVolume.schema';

const CustomPropertiesSection: React.FC = () => {
  const { control, register } = useFormContext<RegisterVolumeFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customProperties' });

  return (
    <FormSection title="Custom properties" titleElement="h2">
      <FormGroup fieldId="volume-custom-properties">
        <Content component="p">
          Add key/value pair annotations to attach metadata to this asset.
        </Content>
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() => append({ id: Date.now(), key: '', value: '' })}
          data-testid="add-custom-property"
        >
          Add key/value pair
        </Button>
        {fields.map((field, index) => (
          <Flex key={field.id} gap={{ default: 'gapMd' }} className="pf-v6-u-mb-md">
            <FlexItem grow={{ default: 'grow' }}>
              <TextInput
                {...register(`customProperties.${index}.key`)}
                placeholder="Key"
                data-testid={`custom-property-key-${index}`}
              />
            </FlexItem>
            <FlexItem grow={{ default: 'grow' }}>
              <TextInput
                {...register(`customProperties.${index}.value`)}
                placeholder="Value"
                data-testid={`custom-property-value-${index}`}
              />
            </FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                onClick={() => remove(index)}
                aria-label="Remove property"
                data-testid={`custom-property-remove-${index}`}
              >
                Remove
              </Button>
            </FlexItem>
          </Flex>
        ))}
      </FormGroup>
    </FormSection>
  );
};

export default CustomPropertiesSection;
