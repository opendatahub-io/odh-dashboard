import { Bullseye, Spinner } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useParams } from 'react-router';
import { getSecrets } from '~/app/api/k8s';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import type { SecretSelection } from '~/app/components/common/SecretSelector';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useNotification } from '~/app/hooks/useNotification';
import { createConfigureSchema, type ConfigureSchema } from '~/app/schemas/configure.schema';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import { REQUIRED_CONNECTION_SECRET_KEYS } from '~/app/utilities/const';
import { generateReconfigureName, getTaskType, parseErrorStatus } from '~/app/utilities/utils';
import AutomlConfigurePage from './AutomlConfigurePage';

const configureBasePartial = createConfigureSchema().base.partial();

/**
 * Intermediate loader that fetches the previous pipeline run, resolves connection
 * secrets, and parses runtime parameters before mounting AutomlConfigurePage.
 *
 * This separation ensures the configure form only mounts once all async data has
 * settled, preventing form state from being re-initialized when data arrives after
 * the initial render.
 */
function AutomlReconfigureLoader(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } = useNamespaceSelector({
    storeLastNamespace: true,
  });

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
  } = usePipelineRunQuery(runId, namespace);

  const notification = useNotification();

  const {
    data: secrets,
    isPending: secretsPending,
    isError: secretsError,
  } = useQuery({
    queryKey: ['secrets', namespace, 'storage'],
    queryFn: () => getSecrets('')(namespace ?? '', 'storage')({}),
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
    secretMissing: false,
  });

  React.useEffect(() => {
    if (secretsError && !shownWarnings.current.secretsLoadError) {
      shownWarnings.current.secretsLoadError = true;
      notification.warning(
        'Unable to load connection secrets',
        'The previously used connection secret could not be loaded. You will need to manually select a connection secret.',
      );
    }
    // notify once when the error state is reached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secretsError]);

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
    const name = params?.train_data_secret_name;
    if (
      name &&
      typeof name === 'string' &&
      secrets &&
      !secrets.find((s) => s.name === name) &&
      !shownWarnings.current.secretMissing
    ) {
      shownWarnings.current.secretMissing = true;
      notification.warning(
        'Connection secret not found',
        `The previously used connection "${name}" could not be found. Please select a new connection.`,
      );
    }
    // notify once when secrets are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.train_data_secret_name, secrets]);

  const invalidPipelineRunId =
    pipelineRunError &&
    pipelineRunLoadError instanceof Error &&
    parseErrorStatus(pipelineRunLoadError) === 404;

  if (noNamespaces || invalidNamespace || invalidPipelineRunId) {
    return (
      <ApplicationsPage
        title={<AutomlHeader />}
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
        title={<AutomlHeader />}
        empty={false}
        loadError={pipelineRunLoadError}
        loaded={namespacesLoaded}
      />
    );
  }

  if (!namespacesLoaded || pipelineRunPending || secretsPending) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const taskType = getTaskType(pipelineRun);
  const secretName = params?.train_data_secret_name;

  // Resolve the matching secret from the fetched list
  let initialInputDataSecret: SecretSelection | undefined;
  if (secretName && typeof secretName === 'string' && secrets) {
    const match = secrets.find((s) => s.name === secretName);
    if (match) {
      const requiredKeys = REQUIRED_CONNECTION_SECRET_KEYS[match.type ?? ''];
      const invalid = requiredKeys
        ? getMissingRequiredKeys(requiredKeys, Object.keys(match.data ?? {})).length > 0
        : true;
      initialInputDataSecret = { ...match, invalid };
    }
  }

  /* eslint-disable camelcase */
  const initialValues: Partial<ConfigureSchema> = {
    ...(parsedParams?.success ? parsedParams.data : {}),
    display_name: generateReconfigureName(pipelineRun.display_name),
    ...(taskType != null && { task_type: taskType }),
  };
  /* eslint-enable camelcase */

  return (
    <AutomlConfigurePage
      initialValues={initialValues}
      initialInputDataSecret={initialInputDataSecret}
      sourceRunId={runId}
      sourceRunName={pipelineRun.display_name}
    />
  );
}

export default AutomlReconfigureLoader;
