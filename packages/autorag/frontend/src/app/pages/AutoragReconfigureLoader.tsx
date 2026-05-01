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
import { REQUIRED_CONNECTION_SECRET_KEYS } from '~/app/utilities/const';
import { parseErrorStatus, generateReconfigureName } from '~/app/utilities/utils';
import AutoragConfigurePage from './AutoragConfigurePage';

const configureBasePartial = createConfigureSchema().base.partial();

/**
 * Intermediate loader that fetches the previous pipeline run, resolves connection
 * secrets, and parses runtime parameters before mounting AutoragConfigurePage.
 *
 * This separation ensures the configure form only mounts once all async data has
 * settled, preventing form state from being re-initialized when data arrives after
 * the initial render.
 */
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

  const params = pipelineRun?.runtime_config?.parameters;

  const parsedParams = React.useMemo(() => {
    if (params == null) {
      return undefined;
    }
    return configureBasePartial.safeParse(params);
  }, [params]);

  const shownWarnings = React.useRef({
    secretsLoadError: false,
    parseError: false,
    storageMissing: false,
    llsMissing: false,
  });

  React.useEffect(() => {
    if ((storageSecretsError || llsSecretsError) && !shownWarnings.current.secretsLoadError) {
      shownWarnings.current.secretsLoadError = true;
      notification.warning(
        'Unable to load connection secrets',
        'The previously used connection secrets could not be loaded. You will need to manually select connection secrets.',
      );
    }
    // notify once when the error state is reached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageSecretsError, llsSecretsError]);

  React.useEffect(() => {
    if (parsedParams && !parsedParams.success && !shownWarnings.current.parseError) {
      shownWarnings.current.parseError = true;
      // eslint-disable-next-line no-console
      console.warn('Failed to parse runtime parameters for reconfiguration:', parsedParams.error);
      notification.warning(
        'Unable to restore all settings',
        'Some parameters from the previous run could not be parsed. Default values will be used instead.',
      );
    }
    // notify once when parsing completes with errors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedParams]);

  React.useEffect(() => {
    const name = params?.input_data_secret_name;
    if (
      name &&
      typeof name === 'string' &&
      storageSecrets &&
      !storageSecrets.find((s) => s.name === name) &&
      !shownWarnings.current.storageMissing
    ) {
      shownWarnings.current.storageMissing = true;
      notification.warning(
        'Connection secret not found',
        `The previously used storage connection "${name}" could not be found. Please select a new connection.`,
      );
    }
    // notify once when secrets are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.input_data_secret_name, storageSecrets]);

  React.useEffect(() => {
    const name = params?.llama_stack_secret_name;
    if (
      name &&
      typeof name === 'string' &&
      llsSecrets &&
      !llsSecrets.find((s) => s.name === name) &&
      !shownWarnings.current.llsMissing
    ) {
      shownWarnings.current.llsMissing = true;
      notification.warning(
        'Connection secret not found',
        `The previously used LlamaStack connection "${name}" could not be found. Please select a new connection.`,
      );
    }
    // notify once when secrets are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.llama_stack_secret_name, llsSecrets]);

  const invalidPipelineRunId =
    pipelineRunError &&
    pipelineRunLoadError instanceof Error &&
    parseErrorStatus(pipelineRunLoadError) === 404;

  if (noNamespaces || invalidNamespace || invalidPipelineRunId) {
    return (
      <ApplicationsPage
        title={<AutoragHeader />}
        empty
        emptyStatePage={
          invalidPipelineRunId ? (
            <InvalidPipelineRun />
          ) : (
            <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
          )
        }
        loadError={namespacesLoadError}
        loaded={namespacesLoaded}
      />
    );
  }

  if (pipelineRunError) {
    return (
      <ApplicationsPage
        title={<AutoragHeader />}
        empty={false}
        loadError={pipelineRunLoadError}
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

  const secretName = params?.input_data_secret_name;
  const llsSecretName = params?.llama_stack_secret_name;

  // Resolve the matching S3 secret from the fetched list
  let initialInputDataSecret: SecretSelection | undefined;
  if (secretName && typeof secretName === 'string' && storageSecrets) {
    const match = storageSecrets.find((s) => s.name === secretName);
    if (match) {
      const requiredKeys = REQUIRED_CONNECTION_SECRET_KEYS[match.type ?? ''];
      const invalid = requiredKeys
        ? getMissingRequiredKeys(requiredKeys, Object.keys(match.data ?? {})).length > 0
        : true;
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
  const initialValues: Partial<ConfigureSchema> = {
    ...(parsedParams?.success ? parsedParams.data : {}),
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
