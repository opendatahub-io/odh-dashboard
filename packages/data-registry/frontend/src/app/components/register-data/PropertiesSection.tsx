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
import {
  LICENSE_VALUES,
  MATURITY_VALUES,
  PII_STATUS_VALUES,
  LicenseType,
  MaturityType,
  PiiStatus,
} from '~/app/types';
import CustomPropertiesSection from './CustomPropertiesSection';

const LICENSE_LABELS: Record<LicenseType, string> = {
  'internal-use': 'Internal use',
  'cc-by-4.0': 'CC BY 4.0',
  'apache-2.0': 'Apache 2.0',
  proprietary: 'Proprietary',
  restricted: 'Restricted',
};

const LICENSE_OPTIONS = LICENSE_VALUES.map((key) => ({ key, label: LICENSE_LABELS[key] }));

const MATURITY_LABELS: Record<MaturityType, string> = {
  experimental: 'Experimental',
  staging: 'Staging',
  production: 'Production',
  deprecated: 'Deprecated',
};

const MATURITY_OPTIONS = MATURITY_VALUES.map((key) => ({ key, label: MATURITY_LABELS[key] }));

const PII_LABELS: Record<PiiStatus, string> = {
  none: 'None',
  'contains-pii': 'Contains PII',
  'contains-sensitive': 'Contains sensitive',
  anonymized: 'Anonymized',
};

const PII_OPTIONS = PII_STATUS_VALUES.map((key) => ({ key, label: PII_LABELS[key] }));

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
                {options.find((option) => option.key === field.value)?.label || placeholder}
              </MenuToggle>
            )}
          >
            <SelectList>
              <SelectOption value="" data-testid={`${testId}-clear`}>
                Not set
              </SelectOption>
              {options.map((option) => (
                <SelectOption key={option.key} value={option.key}>
                  {option.label}
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

      <Controller
        name="domain"
        control={control}
        render={({ field }) => (
          <FormGroup label="Domain" fieldId="data-domain">
            <TextInput
              id="data-domain"
              {...field}
              placeholder="e.g. Finance, Healthcare"
              data-testid="data-domain-input"
            />
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

      <CustomPropertiesSection description="Optionally define custom properties using key-value pairs." />
    </FormSection>
  );
};

export default PropertiesSection;
