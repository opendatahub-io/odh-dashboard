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
  Content,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';

const LICENSE_OPTIONS = [
  { key: 'internal-use', label: 'Internal use' },
  { key: 'cc-by-4.0', label: 'CC BY 4.0' },
  { key: 'apache-2.0', label: 'Apache 2.0' },
  { key: 'proprietary', label: 'Proprietary' },
  { key: 'restricted', label: 'Restricted' },
];

const MATURITY_OPTIONS = [
  { key: 'experimental', label: 'Experimental' },
  { key: 'staging', label: 'Staging' },
  { key: 'production', label: 'Production' },
  { key: 'deprecated', label: 'Deprecated' },
];

const PII_OPTIONS = [
  { key: 'none', label: 'None' },
  { key: 'contains-pii', label: 'Contains PII' },
  { key: 'contains-sensitive', label: 'Contains sensitive' },
  { key: 'anonymized', label: 'Anonymized' },
];

type SelectFieldProps = {
  name: 'license' | 'maturity' | 'piiStatus';
  label: string;
  fieldId: string;
  testId: string;
  options: { key: string; label: string }[];
  placeholder: string;
};

const SelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  fieldId,
  testId,
  options,
  placeholder,
}) => {
  const { control } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormGroup label={label} fieldId={fieldId}>
          <Select
            isOpen={isOpen}
            selected={field.value}
            onSelect={(_event, value) => {
              field.onChange(String(value));
              setIsOpen(false);
            }}
            onOpenChange={setIsOpen}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsOpen((prev) => !prev)}
                isExpanded={isOpen}
                isFullWidth
                data-testid={testId}
              >
                {options.find((o) => o.key === field.value)?.label || placeholder}
              </MenuToggle>
            )}
          >
            <SelectList>
              {options.map((o) => (
                <SelectOption key={o.key} value={o.key}>
                  {o.label}
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </FormGroup>
      )}
    />
  );
};

const PropertiesSection: React.FC = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<RegisterDataFormData | EditAssetFormData>();

  return (
    <FormSection title="Properties" titleElement="h2">
      <Content component="p">
        Define operational metadata, compliance levels, and discoverability tags.
      </Content>

      <Controller
        name="purpose"
        control={control}
        render={({ field }) => (
          <FormGroup label="Purpose" fieldId="data-purpose">
            <TextInput
              id="data-purpose"
              {...field}
              placeholder="e.g. ML training, fraud detection"
              validated={errors.purpose ? 'error' : 'default'}
              data-testid="data-purpose-input"
            />
            {errors.purpose ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{errors.purpose.message}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
        )}
      />

      <SelectField
        name="license"
        label="License"
        fieldId="data-license"
        testId="data-license-toggle"
        options={LICENSE_OPTIONS}
        placeholder="Select license"
      />

      <SelectField
        name="maturity"
        label="Maturity"
        fieldId="data-maturity"
        testId="data-maturity-toggle"
        options={MATURITY_OPTIONS}
        placeholder="Select maturity"
      />

      <SelectField
        name="piiStatus"
        label="PII status"
        fieldId="data-pii"
        testId="data-pii-toggle"
        options={PII_OPTIONS}
        placeholder="Select PII status"
      />
    </FormSection>
  );
};

export default PropertiesSection;
