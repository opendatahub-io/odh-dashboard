import React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  FormSection,
  Form,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { Link } from 'react-router-dom';
import { ExternalProvider } from '~/app/types/external-models';
import CreateExternalProviderForm from '~/app/pages/external-providers/createProvider/CreateExternalProviderForm';
import { UseCreateExternalProviderFormReturn } from '~/app/pages/external-providers/createProvider/useCreateExternalProviderForm';
import { externalProvidersManagementPath } from '~/app/pages/external-providers/const';
import { ProviderSource, type ProviderSourceType } from '~/app/pages/external-models/const';

type SelectProviderStepProps = {
  namespace: string;
  providerSource: ProviderSourceType;
  onProviderSourceChange: (source: ProviderSourceType) => void;
  providerName: string;
  onProviderNameChange: (providerName: string) => void;
  externalProviders: ExternalProvider[];
  createProviderForm: UseCreateExternalProviderFormReturn;
};

const SelectProviderStep: React.FC<SelectProviderStepProps> = ({
  namespace,
  providerSource,
  onProviderSourceChange,
  providerName,
  onProviderNameChange,
  externalProviders,
  createProviderForm,
}) => {
  const providerOptions = React.useMemo<TypeaheadSelectOption[]>(
    () =>
      externalProviders.map((provider) => ({
        value: provider.name,
        content: provider.displayName ?? provider.name,
      })),
    [externalProviders],
  );

  return (
    <Form>
      <FormSection title="Provider">
        <FormGroup hasNoPaddingTop isStack>
          <Stack hasGutter>
            <StackItem>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Select an existing provider or create a new one. A provider stores the
                    connection details for an external model service, including its endpoint and
                    credentials
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </StackItem>
            <StackItem>
              <Radio
                id="provider-source-existing"
                name="provider-source"
                label="Select existing provider"
                isChecked={providerSource === ProviderSource.EXISTING}
                onChange={() => onProviderSourceChange(ProviderSource.EXISTING)}
                data-testid="provider-source-existing"
                body={
                  providerSource === ProviderSource.EXISTING ? (
                    <FormGroup
                      label={<strong>Provider</strong>}
                      fieldId="provider-ref-provider"
                      isRequired
                      hasNoPaddingTop
                      isStack
                    >
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem>
                            Select the provider that supplies the model endpoint and credentials.
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                      <TypeaheadSelect
                        dataTestId="provider-ref-provider-select"
                        selectOptions={providerOptions}
                        selected={providerName}
                        onSelect={(_event, selection) => onProviderNameChange(String(selection))}
                        onClearSelection={() => onProviderNameChange('')}
                        allowClear
                        placeholder="Select a provider"
                        previewDescription={false}
                        isRequired={false}
                        isDisabled={externalProviders.length === 0}
                        isScrollable
                        toggleWidth="100%"
                        popperProps={{ maxWidth: 'trigger' }}
                        toggleProps={{ id: 'provider-ref-provider' }}
                      />
                      {externalProviders.length === 0 && (
                        <Alert
                          variant="info"
                          isInline
                          isPlain
                          title="No external providers found"
                          data-testid="no-external-providers-alert"
                        >
                          Create a provider on the{' '}
                          <Link to={externalProvidersManagementPath(namespace)}>
                            Manage external providers
                          </Link>{' '}
                          page first.
                        </Alert>
                      )}
                    </FormGroup>
                  ) : null
                }
              />
            </StackItem>
            <StackItem>
              <Radio
                id="provider-source-create-new"
                name="provider-source"
                label="Create new provider"
                isChecked={providerSource === ProviderSource.CREATE_NEW}
                onChange={() => onProviderSourceChange(ProviderSource.CREATE_NEW)}
                data-testid="provider-source-create-new"
                body={
                  providerSource === ProviderSource.CREATE_NEW ? (
                    <CreateExternalProviderForm
                      form={createProviderForm}
                      showProjectField={false}
                    />
                  ) : null
                }
              />
            </StackItem>
          </Stack>
        </FormGroup>
      </FormSection>
    </Form>
  );
};

export default SelectProviderStep;
