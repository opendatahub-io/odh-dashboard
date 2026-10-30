import React from 'react';
import { Button, Content, Flex, FlexItem, FormGroup, TextInput } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';
import styles from './RegistrationForm.module.scss';

const CustomPropertiesSection: React.FC = () => {
  const { control, register } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customProperties' });

  const content = (
    <FormGroup
      label="Key-value pairs"
      fieldId="data-custom-properties"
      isStack
      className={styles.describedGroup}
    >
      <Content component="p">Optionally define custom properties using key-value pairs.</Content>
      {fields.length > 0 ? (
        <Flex
          gap={{ default: 'gapMd' }}
          className="pf-v6-u-mb-0"
          data-testid="data-custom-property-headers"
        >
          <FlexItem grow={{ default: 'grow' }}>
            <Content component="small" className="pf-v6-u-font-weight-bold">
              Key
            </Content>
          </FlexItem>
          <FlexItem grow={{ default: 'grow' }}>
            <Content component="small" className="pf-v6-u-font-weight-bold">
              Value
            </Content>
          </FlexItem>
          <FlexItem className={styles.customPropertyHeaderSpacer}>
            <Button variant="plain" aria-hidden tabIndex={-1}>
              <MinusCircleIcon />
            </Button>
          </FlexItem>
        </Flex>
      ) : null}
      {fields.map((field, index) => (
        <Flex key={field.id} gap={{ default: 'gapMd' }} className="pf-v6-u-mb-0">
          <FlexItem grow={{ default: 'grow' }}>
            <TextInput
              id={`data-custom-property-key-${index}`}
              {...register(`customProperties.${index}.key`)}
              aria-label={`Key ${index + 1}`}
              placeholder="Key"
              data-testid={`data-custom-property-key-${index}`}
            />
          </FlexItem>
          <FlexItem grow={{ default: 'grow' }}>
            <TextInput
              id={`data-custom-property-value-${index}`}
              {...register(`customProperties.${index}.value`)}
              aria-label={`Value ${index + 1}`}
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
        className={styles.addCustomProperty}
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
