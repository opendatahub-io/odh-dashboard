import { Bullseye, Spinner } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useParams } from 'react-router';
import { getSecrets } from '~/app/api/k8s';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import type { SecretSelection } from '~/app/components/common/SecretSelector';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import { createConfigureSchema, type ConfigureSchema } from '~/app/schemas/configure.schema';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import { generateReconfigureName } from '~/app/utilities/utils';
import AutoragConfigurePage from './AutoragConfigurePage';
import { REQUIRED_CONNECTION_SECRET_KEYS } from '../utilities/const';

function AutoragReconfigureLoader(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector({
    storeLastNamespace: true,
  });

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
  } = usePipelineRunQuery(runId, namespace);

  const notification = useNotification();

  const {
    data: storageSecrets,
    isPending: storageSecretsPending,
    isError: storageSecretsError,
  } = useQuery({
    queryKey: ['secrets', namespace, 'storage'],
    queryFn: () => getSecrets('')(namespace ?? '', 'storage')({}),
    enabled: !!namespace,
  });

  const {
    data: llsSecrets,
    isPending: llsSecretsPending,
    isError: llsSecretsError,
  } = useQuery({
    queryKey: ['secrets', namespace, 'lls'],
    queryFn: () => getSecrets('')(namespace ?? '', 'lls')({}),
    enabled: !!namespace,
  });

  React.useEffect(() => {
    if (storageSecretsError || llsSecretsError) {
      notification.warning(
        'Unable to load connection secrets',
        'The previously used connection secrets could not be loaded. You will need to manually select connection secrets.',
      );
    }
    // notify once when the error state is reached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageSecretsError, llsSecretsError]);

  if (noNamespaces || invalidNamespace || pipelineRunError) {
    return (
      <ApplicationsPage
        title={<AutoragHeader />}
        empty
        emptyStatePage={
          pipelineRunError ? (
            <InvalidPipelineRun />
          ) : (
            <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
          )
        }
        loadError={pipelineRunLoadError ?? namespacesLoadError}
        loaded={namespacesLoaded}
      />
    );
  }

  if (!namespacesLoaded || pipelineRunPending || storageSecretsPending || llsSecretsPending) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const params = pipelineRun.runtime_config?.parameters;
  const secretName = params?.input_data_secret_name;
  const llsSecretName = params?.llama_stack_secret_name;

  // Resolve the matching S3 secret from the fetched list
  let initialInputDataSecret: SecretSelection | undefined;
  if (secretName && typeof secretName === 'string' && storageSecrets) {
    const match = storageSecrets.find((s) => s.name === secretName);
    if (match) {
      const requiredKeys = REQUIRED_CONNECTION_SECRET_KEYS[match.type ?? ''] ?? [];
      const availableKeys = Object.keys(match.data ?? {});
      const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
      initialInputDataSecret = { ...match, invalid };
    }
  }

  // Resolve the matching LlamaStack secret from the fetched list
  let initialLlamaStackSecret: SecretSelection | undefined;
  if (llsSecretName && typeof llsSecretName === 'string' && llsSecrets) {
    const match = llsSecrets.find((s) => s.name === llsSecretName);
    if (match) {
      initialLlamaStackSecret = match;
    }
  }

  /* eslint-disable camelcase */
  const { base } = createConfigureSchema();
  const parsedParams = base.partial().safeParse(params ?? {});
  const initialValues: Partial<ConfigureSchema> = {
    ...(parsedParams.success ? parsedParams.data : {}),
    display_name: generateReconfigureName(pipelineRun.display_name),
  };
  /* eslint-enable camelcase */

  return (
    <AutoragConfigurePage
      initialValues={initialValues}
      initialInputDataSecret={initialInputDataSecret}
      initialLlamaStackSecret={initialLlamaStackSecret}
      sourceRunId={runId}
      sourceRunName={pipelineRun.display_name}
    />
  );
}

export default AutoragReconfigureLoader;
