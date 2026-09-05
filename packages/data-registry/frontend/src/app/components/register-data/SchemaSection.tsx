import React from 'react';
import {
  FormGroup,
  FormSection,
  TextInput,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  Button,
  Content,
  Checkbox,
  Flex,
  FlexItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';

const COLUMN_TYPE_OPTIONS = [
  { key: 'string', label: 'string' },
  { key: 'integer', label: 'integer' },
  { key: 'long', label: 'long' },
  { key: 'float', label: 'float' },
  { key: 'double', label: 'double' },
  { key: 'boolean', label: 'boolean' },
  { key: 'date', label: 'date' },
  { key: 'timestamp', label: 'timestamp' },
  { key: 'binary', label: 'binary' },
  { key: 'decimal', label: 'decimal' },
];

const SchemaSection: React.FC = () => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'schemaFields' });
  const [openTypeIndex, setOpenTypeIndex] = React.useState<number | null>(null);
  const nextIdRef = React.useRef(0);

  return (
    <FormSection title="Schema" titleElement="h2">
      <Content component="p">Define columns and data types for structured assets.</Content>

      {fields.length > 0 ? (
        <FormGroup fieldId="schema-columns">
          <Flex gap={{ default: 'gapMd' }} className="pf-v6-u-mb-sm">
            <FlexItem style={{ flex: 2 }}>
              <Content component="small">
                <strong>Column name *</strong>
              </Content>
            </FlexItem>
            <FlexItem style={{ flex: 1 }}>
              <Content component="small">
                <strong>Type *</strong>
              </Content>
            </FlexItem>
            <FlexItem style={{ flex: 2 }}>
              <Content component="small">
                <strong>Description</strong>
              </Content>
            </FlexItem>
            <FlexItem>
              <Content component="small">
                <strong>Nullable</strong>
              </Content>
            </FlexItem>
            <FlexItem style={{ width: '32px' }} />
          </Flex>

          {fields.map((field, index) => (
            <Flex key={field.id} gap={{ default: 'gapMd' }} className="pf-v6-u-mb-md">
              <FlexItem style={{ flex: 2 }}>
                <TextInput
                  {...register(`schemaFields.${index}.name`)}
                  placeholder="e.g. claim_id"
                  isRequired
                  validated={errors.schemaFields?.[index]?.name ? 'error' : 'default'}
                  aria-label={`Column ${index + 1} name`}
                  data-testid={`schema-column-name-${index}`}
                />
                {errors.schemaFields?.[index]?.name ? (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">
                        {errors.schemaFields[index].name.message}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                ) : null}
              </FlexItem>
              <FlexItem style={{ flex: 1 }}>
                <Controller
                  name={`schemaFields.${index}.type`}
                  control={control}
                  render={({ field: typeField }) => (
                    <Select
                      isOpen={openTypeIndex === index}
                      selected={typeField.value}
                      onSelect={(_event, value) => {
                        typeField.onChange(String(value));
                        setOpenTypeIndex(null);
                      }}
                      onOpenChange={(open) => setOpenTypeIndex(open ? index : null)}
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() =>
                            setOpenTypeIndex((prev) => (prev === index ? null : index))
                          }
                          isExpanded={openTypeIndex === index}
                          isFullWidth
                          data-testid={`schema-column-type-${index}`}
                        >
                          {typeField.value || 'Select type'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {COLUMN_TYPE_OPTIONS.map((opt) => (
                          <SelectOption key={opt.key} value={opt.key}>
                            {opt.label}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  )}
                />
              </FlexItem>
              <FlexItem style={{ flex: 2 }}>
                <TextInput
                  {...register(`schemaFields.${index}.description`)}
                  placeholder="e.g. Unique claim identifier"
                  aria-label={`Column ${index + 1} description`}
                  data-testid={`schema-column-description-${index}`}
                />
              </FlexItem>
              <FlexItem>
                <Controller
                  name={`schemaFields.${index}.nullable`}
                  control={control}
                  render={({ field: nullableField }) => (
                    <Checkbox
                      id={`schema-column-nullable-${index}`}
                      isChecked={nullableField.value}
                      onChange={(_event, checked) => nullableField.onChange(checked)}
                      aria-label={`Column ${index + 1} nullable`}
                      data-testid={`schema-column-nullable-${index}`}
                    />
                  )}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  onClick={() => remove(index)}
                  aria-label={`Remove column ${index + 1}`}
                  data-testid={`schema-column-remove-${index}`}
                >
                  <MinusCircleIcon />
                </Button>
              </FlexItem>
            </Flex>
          ))}
        </FormGroup>
      ) : null}

      <FormGroup fieldId="add-schema-column">
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() => {
            nextIdRef.current += 1;
            append({
              id: nextIdRef.current,
              name: '',
              type: 'string',
              description: '',
              nullable: true,
            });
          }}
          data-testid="add-schema-column"
        >
          Add column
        </Button>
      </FormGroup>
    </FormSection>
  );
};

export default SchemaSection;
