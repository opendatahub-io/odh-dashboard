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
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import { generateReconfigureName, parseErrorStatus } from '~/app/utilities/utils';
import AutoragConfigurePage from './AutoragConfigurePage';

const AUTORAG_REQUIRED_KEYS: { [type: string]: string[] } = {
  s3: ['AWS_S3_BUCKET', 'AWS_DEFAULT_REGION'],
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

  const { data: storageSecrets, isPending: storageSecretsPending } = useQuery({
    queryKey: ['secrets', namespace, 'storage'],
    queryFn: () => getSecrets('')(namespace ?? '', 'storage')({}),
    enabled: !!namespace,
  });

  const { data: llsSecrets, isPending: llsSecretsPending } = useQuery({
    queryKey: ['secrets', namespace, 'lls'],
    queryFn: () => getSecrets('')(namespace ?? '', 'lls')({}),
    enabled: !!namespace,
  });

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
        loadError={pipelineRunLoadError ?? namespacesLoadError}
        loaded={namespacesLoaded}
      />
    );
  }

  if (
    !namespacesLoaded ||
    pipelineRunPending ||
    storageSecretsPending ||
    llsSecretsPending ||
    !pipelineRun
  ) {
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
  let initialSecret: SecretSelection | undefined;
  if (secretName && typeof secretName === 'string' && storageSecrets) {
    const match = storageSecrets.find((s) => s.name === secretName);
    if (match) {
      const requiredKeys = AUTORAG_REQUIRED_KEYS[match.type ?? ''] ?? [];
      const availableKeys = Object.keys(match.data);
      const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
      initialSecret = { ...match, invalid };
    }
  }

  // Resolve the matching LlamaStack secret from the fetched list
  let initialLlamaStackSecret: SecretSelection | undefined;
  if (llsSecretName && typeof llsSecretName === 'string' && llsSecrets) {
    const match = llsSecrets.find((s) => s.name === llsSecretName);
    if (match) {
      initialLlamaStackSecret = { ...match, invalid: false };
    }
  }

  /* eslint-disable camelcase */
  const initialValues: Partial<ConfigureSchema> & {
    initialSecret?: SecretSelection;
    initialLlamaStackSecret?: SecretSelection;
  } = {
    ...params,
    display_name: generateReconfigureName(pipelineRun.display_name),
    initialSecret,
    initialLlamaStackSecret,
  };
  /* eslint-enable camelcase */

  return <AutoragConfigurePage initialValues={initialValues} sourceRunId={runId} />;
}

export default AutoragReconfigureLoader;
