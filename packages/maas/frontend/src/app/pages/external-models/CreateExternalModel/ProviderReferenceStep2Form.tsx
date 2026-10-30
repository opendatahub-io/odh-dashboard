import React from 'react';
import {
  Form,
  Stack,
  FormHelperText,
  FormSection,
  HelperTextItem,
  HelperText,
} from '@patternfly/react-core';
import { ExternalProvider } from '~/app/types/external-models';
import {
  ExternalModelProviderContext,
  ExternalModelProviderSource,
} from '~/app/types/event-tracking';
import CreateExternalProviderSubmitError from '~/app/pages/external-providers/createProvider/CreateExternalProviderSubmitError';
import {
  ProviderReferenceFieldErrors,
  ProviderReferenceFormData,
  ProviderReferenceHelperVariant,
  InitialProviderReferenceFormData,
} from '~/app/pages/external-models/validations';
import {
  ProviderReferenceApiFormatField,
  ProviderReferenceConfigSection,
  ProviderReferencePathField,
  ProviderReferenceTargetModelField,
} from './ProviderReferenceStep2Fields';

type ProviderReferenceStep2FormProps = {
  form: ProviderReferenceFormData | InitialProviderReferenceFormData;
  selectedProvider?: ExternalProvider;
  onChange: (updates: Partial<ProviderReferenceFormData>) => void;
  fieldErrors?: ProviderReferenceFieldErrors;
  helperVariant?: ProviderReferenceHelperVariant;
  onTargetModelBlur?: () => void;
  onPathBlur?: () => void;
  createProviderSubmitError?: string;
  providerSource: ExternalModelProviderSource;
  context: ExternalModelProviderContext;
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
  createProviderSubmitError,
  providerSource,
  context,
  wrapInForm = true,
}) => {
  const fields = (
    <Stack hasGutter>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            Configure how requests are sent to this provider. The API format determines how requests
            are translated. The path is appended to the provider endpoint when routing requests.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      <ProviderReferenceApiFormatField
        form={form}
        onChange={onChange}
        showHelperText={helperVariant === 'add'}
      />
      <ProviderReferenceTargetModelField
        form={form}
        onChange={onChange}
        fieldErrors={fieldErrors}
        onBlur={onTargetModelBlur}
      />
      <ProviderReferencePathField
        form={form}
        onChange={onChange}
        fieldErrors={fieldErrors}
        pathHelperVariant={helperVariant}
        showResetButton
        onBlur={onPathBlur}
        providerType={selectedProvider?.provider ?? ''}
        context={context}
      />
      <ProviderReferenceConfigSection
        form={form}
        onChange={onChange}
        selectedProvider={selectedProvider}
        variant="advanced"
        helperVariant={helperVariant}
        providerSource={providerSource}
        context={context}
      />
      <CreateExternalProviderSubmitError
        error={createProviderSubmitError}
        dataTestId="create-external-provider-wizard-step-2-error"
      />
    </Stack>
  );

  return wrapInForm ? (
    <Form>
      <FormSection title="Model configuration">{fields}</FormSection>
    </Form>
  ) : (
    fields
  );
};

export default ProviderReferenceStep2Form;
