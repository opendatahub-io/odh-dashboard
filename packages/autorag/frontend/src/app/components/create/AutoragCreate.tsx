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
import LlamaStackConnectionModal from '~/app/components/common/LlamaStackConnectionModal';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';

function AutoragCreate(): React.JSX.Element {
  const { namespace } = useParams();
  const [selectedLlamaStackSecret, setSelectedLlamaStackSecret] = React.useState<
    SecretSelection | undefined
  >();
  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);

  const form = useFormContext<ConfigureSchema>();
  const { setValue } = form;

  // When pressing "Back" to return to this screen, the SecretSelector appears to have no value set
  // even though "llama_stack_secret_name" is set from before.
  // This is because TypeaheadSelect in SecretSelector does not support specifying an initial value.
  // Therefore, reset field on mount to avoid confusion of "Next" button being enabled even though
  // no selection appears to be made.
  useEffect(() => {
    setValue('llama_stack_secret_name', '');
  }, [setValue]);

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
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="Description">
            <TextArea {...field} id={field.name} />
          </FormGroup>
        )}
      />
      <Controller
        control={form.control}
        name="llama_stack_secret_name"
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="Llama Stack connection" isRequired>
            <Split hasGutter>
              <SplitItem isFilled>
                <SecretSelector
                  dataTestId="lls-secret-selector"
                  placeholder="Select Llama Stack secret"
                  type="lls"
                  namespace={namespace ?? ''}
                  value={selectedLlamaStackSecret?.uuid}
                  onChange={(secret) => {
                    setSelectedLlamaStackSecret(secret);
                    field.onChange(!secret || secret.invalid ? '' : secret.name);
                  }}
                  onRefreshReady={(refresh) => {
                    secretsRefreshRef.current = refresh;
                  }}
                />
              </SplitItem>
              <SplitItem>
                <Button
                  data-testid="add-lls-connection-button"
                  variant="tertiary"
                  aria-label="Add new Llama Stack connection"
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
        <LlamaStackConnectionModal
          namespace={namespace ?? ''}
          onClose={() => setIsConnectionModalOpen(false)}
          onSubmit={async (secretName) => {
            const refresh = secretsRefreshRef.current;
            if (!refresh) {
              return;
            }
            const list = await refresh();
            const secret = list?.find((s) => s.name === secretName);
            if (secret) {
              setSelectedLlamaStackSecret({ ...secret, invalid: false });
              setValue('llama_stack_secret_name', secret.name, { shouldValidate: true });
            }
          }}
        />
      )}
    </div>
  );
}

export default AutoragCreate;
