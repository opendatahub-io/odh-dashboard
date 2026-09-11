import React from 'react';
import {
  Alert,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
} from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { Link } from 'react-router-dom';
import { ExternalProvider } from '~/app/types/external-models';
import { externalProvidersManagementPath } from '~/app/pages/external-providers/const';

export type ProviderSourceType = 'existing' | 'create-new';

type SelectProviderStepProps = {
  namespace: string;
  providerSource: ProviderSourceType;
  onProviderSourceChange: (source: ProviderSourceType) => void;
  providerName: string;
  onProviderNameChange: (providerName: string) => void;
  externalProviders: ExternalProvider[];
};

const SelectProviderStep: React.FC<SelectProviderStepProps> = ({
  namespace,
  providerSource,
  onProviderSourceChange,
  providerName,
  onProviderNameChange,
  externalProviders,
}) => {
  const providerOptions = React.useMemo<TypeaheadSelectOption[]>(
    () =>
      externalProviders.map((provider) => ({
        value: provider.name,
        content: provider.displayName ?? provider.name,
      })),
    [externalProviders],
  );

  const handleProviderSourceChange = (source: ProviderSourceType) => {
    onProviderSourceChange(source);
    if (source === 'create-new') {
      onProviderNameChange('');
    }
  };

  return (
    <Form>
      <FormGroup hasNoPaddingTop isStack>
        <Radio
          id="provider-source-existing"
          name="provider-source"
          label="Use existing provider"
          isChecked={providerSource === 'existing'}
          onChange={() => handleProviderSourceChange('existing')}
          data-testid="provider-source-existing"
          body={
            providerSource === 'existing' ? (
              <FormGroup
                label="External provider"
                fieldId="provider-ref-provider"
                isRequired
                hasNoPaddingTop
                isStack
              >
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
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Select the external provider that supplies the endpoint and credentials.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
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
        <Radio
          id="provider-source-create-new"
          name="provider-source"
          label="Create new provider"
          isChecked={providerSource === 'create-new'}
          onChange={() => handleProviderSourceChange('create-new')}
          data-testid="provider-source-create-new"
          body={
            providerSource === 'create-new' ? (
              <Alert
                variant="info"
                isInline
                isPlain
                title="Create new provider is not available here yet"
              />
            ) : null
          }
        />
      </FormGroup>
    </Form>
  );
};

export default SelectProviderStep;
