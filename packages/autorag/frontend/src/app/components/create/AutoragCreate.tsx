import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import React, { useEffect, useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import MaaSConnectionModal from '~/app/components/common/MaaSConnectionModal';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';

type AutoragCreateProps = {
  initialMaaSSecret?: SecretSelection;
};

function AutoragCreate({ initialMaaSSecret }: AutoragCreateProps): React.JSX.Element {
  const { namespace } = useParams();
  const [selectedMaaSSecret, setSelectedMaaSSecret] = React.useState<SecretSelection | undefined>(
    initialMaaSSecret,
  );
  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);

  const form = useFormContext<ConfigureSchema>();
  const { setValue } = form;

  // When pressing "Back" to return to this screen, the SecretSelector appears to have no value set
  // even though "maas_secret_name" is set from before.
  // This is because TypeaheadSelect in SecretSelector does not support specifying an initial value.
  // Therefore, reset field on mount to avoid confusion of "Next" button being enabled even though
  // no selection appears to be made.
  // Skip the reset when an initial secret is provided (reconfigure flow).
  useEffect(() => {
    if (!initialMaaSSecret) {
      setValue('maas_secret_name', '');
    }
  }, [setValue, initialMaaSSecret]);

  // Use a div instead of PF's <Form> to avoid nested <form> elements,
  // since AutoragConfigurePage already renders <Stack component="form">.
  return (
    <div className="pf-v6-c-form pf-m-limit-width">
      <Controller
        control={form.control}
        name="display_name"
        render={({ field, fieldState }) => (
          <FormGroup fieldId={field.name} label="Name" isRequired>
            <TextInput
              {...field}
              id={field.name}
              data-testid="autorag-name-input"
              type="text"
              isRequired
              validated={fieldState.invalid ? 'error' : undefined}
            />
            {fieldState.error && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{fieldState.error.message}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        )}
      />
      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <FormGroup fieldId={field.name} label="Description">
            <TextArea
              {...field}
              id={field.name}
              data-testid="autorag-description-input"
              validated={fieldState.invalid ? 'error' : undefined}
            />
            {fieldState.error && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{fieldState.error.message}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        )}
      />
      <Controller
        control={form.control}
        name="maas_secret_name"
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="MaaS connection" isRequired>
            <Split hasGutter>
              <SplitItem isFilled>
                <SecretSelector
                  dataTestId="maas-secret-selector"
                  placeholder="Select MaaS secret"
                  type="maas"
                  namespace={namespace ?? ''}
                  value={selectedMaaSSecret?.uuid}
                  onChange={(secret) => {
                    setSelectedMaaSSecret(secret);
                    field.onChange(!secret || secret.invalid ? '' : secret.name);
                  }}
                  onRefreshReady={(refresh) => {
                    secretsRefreshRef.current = refresh;
                  }}
                />
              </SplitItem>
              <SplitItem>
                <Button
                  data-testid="add-maas-connection-button"
                  variant="tertiary"
                  aria-label="Add new MaaS connection"
                  onClick={() => setIsConnectionModalOpen(true)}
                >
                  Add new connection
                </Button>
              </SplitItem>
            </Split>
          </FormGroup>
        )}
      />
      {isConnectionModalOpen && (
        <MaaSConnectionModal
          namespace={namespace ?? ''}
          onClose={() => setIsConnectionModalOpen(false)}
          onSubmit={async (secretName) => {
            const refresh = secretsRefreshRef.current;
            if (!refresh) {
              throw new Error('The MaaS Secret list could not be refreshed.');
            }
            const list = await refresh();
            const secret = list?.find((s) => s.name === secretName);
            if (!secret) {
              throw new Error(
                'The new MaaS Secret was not found after refreshing the Secret list.',
              );
            }
            setSelectedMaaSSecret({ ...secret, invalid: false });
            setValue('maas_secret_name', secret.name, { shouldValidate: true });
          }}
        />
      )}
    </div>
  );
}

export default AutoragCreate;
