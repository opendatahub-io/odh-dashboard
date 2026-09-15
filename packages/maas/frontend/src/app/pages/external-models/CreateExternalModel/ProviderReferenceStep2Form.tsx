import React from 'react';
import { Form } from '@patternfly/react-core';
import { ExternalProvider } from '~/app/types/external-models';
import {
  ProviderReferenceFieldErrors,
  ProviderReferenceFormData,
  ProviderReferenceHelperVariant,
} from '~/app/pages/external-models/validations';
import {
  ProviderReferenceApiFormatField,
  ProviderReferenceConfigSection,
  ProviderReferencePathField,
  ProviderReferenceTargetModelField,
} from './ProviderReferenceStep2Fields';

type ProviderReferenceStep2FormProps = {
  form: ProviderReferenceFormData;
  selectedProvider?: ExternalProvider;
  onChange: (updates: Partial<ProviderReferenceFormData>) => void;
  fieldErrors?: ProviderReferenceFieldErrors;
  helperVariant?: ProviderReferenceHelperVariant;
  onTargetModelBlur?: () => void;
  onPathBlur?: () => void;
  /** Set false when fields render inside a parent Form (e.g. edit provider ref modal). */
  wrapInForm?: boolean;
};

const ProviderReferenceStep2Form: React.FC<ProviderReferenceStep2FormProps> = ({
  form,
  selectedProvider,
  onChange,
  fieldErrors,
  helperVariant = 'add',
  onTargetModelBlur,
  onPathBlur,
  wrapInForm = true,
}) => {
  const fields = (
    <>
      <ProviderReferenceApiFormatField
        form={form}
        onChange={onChange}
        showHelperText={helperVariant === 'add'}
      />
      <ProviderReferenceTargetModelField
        form={form}
        onChange={onChange}
        fieldErrors={fieldErrors}
        showHelperText={helperVariant === 'add'}
        onBlur={onTargetModelBlur}
      />
      <ProviderReferencePathField
        form={form}
        onChange={onChange}
        fieldErrors={fieldErrors}
        pathHelperVariant={helperVariant}
        showResetButton
        onBlur={onPathBlur}
      />
      <ProviderReferenceConfigSection
        form={form}
        onChange={onChange}
        selectedProvider={selectedProvider}
        variant="advanced"
        helperVariant={helperVariant}
      />
    </>
  );

  return wrapInForm ? <Form>{fields}</Form> : fields;
};

export default ProviderReferenceStep2Form;
