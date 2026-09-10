import React from 'react';
import { Form } from '@patternfly/react-core';
import { ExternalProvider } from '~/app/types/external-models';
import {
  ProviderReferenceApiFormatField,
  ProviderReferenceConfigSection,
  ProviderReferencePathField,
  ProviderReferenceTargetModelField,
} from './ProviderReferenceStep2Fields';
import {
  ProviderReferenceFieldErrors,
  ProviderReferenceFormData,
} from './providerReferenceFormTypes';

type AddProviderReferenceFormProps = {
  form: ProviderReferenceFormData;
  selectedProvider?: ExternalProvider;
  onChange: (updates: Partial<ProviderReferenceFormData>) => void;
  fieldErrors?: ProviderReferenceFieldErrors;
};

const AddProviderReferenceForm: React.FC<AddProviderReferenceFormProps> = ({
  form,
  selectedProvider,
  onChange,
  fieldErrors,
}) => (
  <Form>
    <ProviderReferenceApiFormatField form={form} onChange={onChange} showHelperText />
    <ProviderReferenceTargetModelField
      form={form}
      onChange={onChange}
      fieldErrors={fieldErrors}
      showHelperText
    />
    <ProviderReferencePathField
      form={form}
      onChange={onChange}
      fieldErrors={fieldErrors}
      pathHelperVariant="add"
      showResetButton
    />
    <ProviderReferenceConfigSection
      form={form}
      onChange={onChange}
      selectedProvider={selectedProvider}
      variant="advanced"
    />
  </Form>
);

export default AddProviderReferenceForm;
