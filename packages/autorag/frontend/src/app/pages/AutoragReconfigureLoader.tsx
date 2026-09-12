import { Bullseye, Spinner } from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { useQuery } from '@tanstack/react-query';
import * as z from 'zod';
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

const configureSchema = createConfigureSchema();
const configureBase = configureSchema.base;
const LEGACY_RUNTIME_FIELDS = ['input_data_key', 'ogx_secret_name', 'vector_io_provider_id'];
const LEGACY_WARNING_TITLE = 'Unable to restore all settings';
const LEGACY_WARNING_BODY =
  'Some parameters from the previous run could not be parsed. Default values will be used instead.';

const hasNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const hasCurrentConnectionParameters = (params: Record<string, unknown>): boolean =>
  hasNonEmptyString(params.maas_secret_name) && hasNonEmptyString(params.vector_db_secret_name);

const hasCurrentRuntimeShape = (params: Record<string, unknown>): boolean =>
  hasCurrentConnectionParameters(params) &&
  (Array.isArray(params.input_data_keys) || hasNonEmptyString(params.input_data_key)) &&
  'generation_models' in params &&
  'embedding_models' in params;

const hasLegacyRuntimeParameters = (params?: Record<string, unknown>): boolean =>
  !!params &&
  !hasCurrentConnectionParameters(params) &&
  LEGACY_RUNTIME_FIELDS.some((field) => field in params);

const RECONFIGURE_FIELDS = [
  'description',
  'input_data_secret_name',
  'input_data_bucket_name',
  'test_data_secret_name',
  'test_data_bucket_name',
  'test_data_key',
  'preset',
  'maas_secret_name',
  'vector_db_secret_name',
  'generation_models',
  'embedding_models',
  'optimization_metric',
  'optimization_max_rag_patterns',
] as const;

type ReconfigureParseResult = {
  data: Partial<ConfigureSchema>;
  hasInvalidFields: boolean;
};

const parseReconfigureParameters = (params: Record<string, unknown>): ReconfigureParseResult => {
  const data: Record<string, unknown> = { ...configureSchema.defaults };
  let hasInvalidFields = !hasLegacyRuntimeParameters(params) && !hasCurrentRuntimeShape(params);

  for (const key of RECONFIGURE_FIELDS) {
    if (!(key in params)) {
      continue;
    }
    const result = configureBase.shape[key].safeParse(params[key]);
    if (result.success) {
      data[key] = result.data;
    } else {
      hasInvalidFields = true;
    }
  }

  /* eslint-disable camelcase */
  const inputDataKeys = z.array(z.string().min(1)).min(1).max(10).safeParse(params.input_data_keys);
  if (inputDataKeys.success) {
    data.input_data_keys = inputDataKeys.data;
  } else if (hasCurrentConnectionParameters(params) && hasNonEmptyString(params.input_data_key)) {
    data.input_data_keys = [params.input_data_key];
  } else if ('input_data_keys' in params) {
    data.input_data_keys = [];
    hasInvalidFields = true;
  }

  /* eslint-enable camelcase */
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { data: data as Partial<ConfigureSchema>, hasInvalidFields };
};

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
  const params = pipelineRun?.runtime_config?.parameters;
  const isLegacyRun = hasLegacyRuntimeParameters(params);

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
    data: maasSecrets,
    isPending: maasSecretsPending,
    isError: maasSecretsError,
  } = useQuery({
    queryKey: ['secrets', namespace, 'maas'],
    queryFn: () => getSecrets('')(namespace ?? '', 'maas')({}),
    enabled: !!namespace && !isLegacyRun,
  });
  const {
    data: vectorDbSecrets,
    isPending: vectorDbSecretsPending,
    isError: vectorDbSecretsError,
  } = useQuery({
    queryKey: ['secrets', namespace, 'vector-db'],
    queryFn: () => getSecrets('')(namespace ?? '', 'vector-db')({}),
    enabled: !!namespace && !isLegacyRun,
  });

  const parsedParams = React.useMemo(
    () => (params == null ? undefined : parseReconfigureParameters(params)),
    [params],
  );
  const shownWarnings = React.useRef({
    secretsLoadError: false,
    parseError: false,
    storageMissing: false,
    maasMissing: false,
    vectorDbMissing: false,
  });

  React.useEffect(() => {
    if (
      !isLegacyRun &&
      (storageSecretsError || maasSecretsError || vectorDbSecretsError) &&
      !shownWarnings.current.secretsLoadError
    ) {
      shownWarnings.current.secretsLoadError = true;
      notification.warning(
        'Unable to load connection secrets',
        'The previously used connection secrets could not be loaded. You will need to manually select connection secrets.',
      );
    }
  }, [isLegacyRun, storageSecretsError, maasSecretsError, vectorDbSecretsError, notification]);

  React.useEffect(() => {
    if ((isLegacyRun || parsedParams?.hasInvalidFields) && !shownWarnings.current.parseError) {
      shownWarnings.current.parseError = true;
      notification.warning(LEGACY_WARNING_TITLE, LEGACY_WARNING_BODY);
    }
  }, [isLegacyRun, parsedParams, notification]);

  const warnMissingSecret = React.useCallback(
    (
      name: unknown,
      secrets: SecretSelection[] | undefined,
      key: 'storageMissing' | 'maasMissing' | 'vectorDbMissing',
      label: string,
    ) => {
      if (
        typeof name === 'string' &&
        secrets &&
        !secrets.find((secret) => secret.name === name) &&
        !shownWarnings.current[key]
      ) {
        shownWarnings.current[key] = true;
        notification.warning(
          'Connection secret not found',
          `The previously used ${label} connection "${name}" could not be found. Please select a new connection.`,
        );
      }
    },
    [notification],
  );

  React.useEffect(() => {
    if (!isLegacyRun) {
      warnMissingSecret(
        params?.input_data_secret_name,
        storageSecrets,
        'storageMissing',
        'storage',
      );
      warnMissingSecret(params?.maas_secret_name, maasSecrets, 'maasMissing', 'MaaS');
      warnMissingSecret(
        params?.vector_db_secret_name,
        vectorDbSecrets,
        'vectorDbMissing',
        'vector database',
      );
    }
  }, [isLegacyRun, params, storageSecrets, maasSecrets, vectorDbSecrets, warnMissingSecret]);

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

  if (
    !namespacesLoaded ||
    pipelineRunPending ||
    storageSecretsPending ||
    (!isLegacyRun && (maasSecretsPending || vectorDbSecretsPending))
  ) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const inputSecretName = params?.input_data_secret_name;
  const maasSecretName = params?.maas_secret_name;
  const vectorDbSecretName = params?.vector_db_secret_name;
  const initialInputDataSecret =
    typeof inputSecretName === 'string'
      ? storageSecrets?.find((secret) => secret.name === inputSecretName)
      : undefined;
  const initialMaaSSecret =
    typeof maasSecretName === 'string'
      ? maasSecrets?.find((secret) => secret.name === maasSecretName)
      : undefined;
  const initialVectorDbSecret =
    typeof vectorDbSecretName === 'string'
      ? vectorDbSecrets?.find((secret) => secret.name === vectorDbSecretName)
      : undefined;

  const resolvedInputSecret = initialInputDataSecret
    ? {
        ...initialInputDataSecret,
        invalid: (() => {
          const requiredKeys = initialInputDataSecret.type
            ? REQUIRED_CONNECTION_SECRET_KEYS[initialInputDataSecret.type]
            : undefined;
          return requiredKeys
            ? getMissingRequiredKeys(requiredKeys, Object.keys(initialInputDataSecret.data ?? {}))
                .length > 0
            : false;
        })(),
      }
    : undefined;

  /* eslint-disable camelcase */
  const initialValues: Partial<ConfigureSchema> = {
    ...(parsedParams?.data ?? {}),
    input_data_keys: parsedParams?.data.input_data_keys ?? [],
    generation_models: parsedParams?.data.generation_models ?? [],
    embedding_models: parsedParams?.data.embedding_models ?? [],
    maas_secret_name: parsedParams?.data.maas_secret_name ?? '',
    vector_db_secret_name: parsedParams?.data.vector_db_secret_name ?? '',
    display_name: generateReconfigureName(pipelineRun.display_name),
  };

  if (isLegacyRun) {
    const legacyInputDataKey = params?.input_data_key;
    initialValues.input_data_keys =
      typeof legacyInputDataKey === 'string' && legacyInputDataKey.trim() !== ''
        ? [legacyInputDataKey]
        : [];
    initialValues.generation_models = [];
    initialValues.embedding_models = [];
    initialValues.maas_secret_name = '';
    initialValues.vector_db_secret_name = '';
  }
  /* eslint-enable camelcase */

  return (
    <AutoragConfigurePage
      initialValues={initialValues}
      initialInputDataSecret={resolvedInputSecret}
      initialMaaSSecret={initialMaaSSecret ? { ...initialMaaSSecret, invalid: false } : undefined}
      initialVectorDbSecret={
        initialVectorDbSecret ? { ...initialVectorDbSecret, invalid: false } : undefined
      }
      sourceRunId={runId}
      sourceRunName={pipelineRun.display_name}
    />
  );
}

export default AutoragReconfigureLoader;
