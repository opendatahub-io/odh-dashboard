import React from 'react';
import {
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
import { ExternalProvider } from '~/app/types/external-models';
import CreateExternalProviderForm from '~/app/pages/external-providers/createProvider/CreateExternalProviderForm';
import { UseCreateExternalProviderFormReturn } from '~/app/pages/external-providers/createProvider/useCreateExternalProviderForm';
import { ProviderSource, type ProviderSourceType } from '~/app/pages/external-models/const';

type SelectProviderStepProps = {
  providerSource: ProviderSourceType;
  onProviderSourceChange: (source: ProviderSourceType) => void;
  providerName: string;
  onProviderNameChange: (providerName: string) => void;
  externalProviders: ExternalProvider[];
  createProviderForm: UseCreateExternalProviderFormReturn;
};

const SelectProviderStep: React.FC<SelectProviderStepProps> = ({
  providerSource,
  onProviderSourceChange,
  providerName,
  onProviderNameChange,
  externalProviders,
  createProviderForm,
}) => {
  const hasExistingProviders = externalProviders.length > 0;
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
              <Stack hasGutter>
                <StackItem>
                  <Radio
                    id="provider-source-existing"
                    name="provider-source"
                    label="Select existing provider"
                    isChecked={providerSource === ProviderSource.EXISTING}
                    isDisabled={!hasExistingProviders}
                    onChange={() => onProviderSourceChange(ProviderSource.EXISTING)}
                    data-testid="provider-source-existing"
                    body={
                      providerSource === ProviderSource.EXISTING && hasExistingProviders ? (
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
                                Select the provider that supplies the model endpoint and
                                credentials.
                              </HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                          <TypeaheadSelect
                            dataTestId="provider-ref-provider-select"
                            selectOptions={providerOptions}
                            selected={providerName}
                            onSelect={(_event, selection) =>
                              onProviderNameChange(String(selection))
                            }
                            onClearSelection={() => onProviderNameChange('')}
                            allowClear
                            placeholder="Select a provider"
                            previewDescription={false}
                            isRequired={false}
                            isScrollable
                            toggleWidth="100%"
                            popperProps={{ maxWidth: 'trigger' }}
                            toggleProps={{ id: 'provider-ref-provider' }}
                          />
                        </FormGroup>
                      ) : null
                    }
                  />
                </StackItem>
                {!hasExistingProviders && (
                  <StackItem>
                    <HelperText data-testid="no-external-providers-helper">
                      <HelperTextItem>
                        No external providers exist. Create a new provider.
                      </HelperTextItem>
                    </HelperText>
                  </StackItem>
                )}
              </Stack>
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
