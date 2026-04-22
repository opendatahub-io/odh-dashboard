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
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { automlExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import { generateReconfigureName, getTaskType, parseErrorStatus } from '~/app/utilities/utils';
import AutomlConfigurePage from './AutomlConfigurePage';

const AUTOML_REQUIRED_KEYS: { [type: string]: string[] } = {
  s3: ['AWS_S3_BUCKET', 'AWS_DEFAULT_REGION'],
};

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

  const { data: secrets, isPending: secretsPending } = useQuery({
    queryKey: ['secrets', namespace, 'storage'],
    queryFn: () => getSecrets('')(namespace ?? '', 'storage')({}),
    enabled: !!namespace,
  });

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
        loadError={pipelineRunLoadError ?? namespacesLoadError}
        loaded={namespacesLoaded}
      />
    );
  }

  if (!namespacesLoaded || pipelineRunPending || secretsPending || !pipelineRun) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const params = pipelineRun.runtime_config?.parameters;
  const taskType = getTaskType(pipelineRun);
  const secretName = params?.train_data_secret_name;

  // Resolve the matching secret from the fetched list
  let initialSecret: SecretSelection | undefined;
  if (secretName && typeof secretName === 'string' && secrets) {
    const match = secrets.find((s) => s.name === secretName);
    if (match) {
      const requiredKeys = AUTOML_REQUIRED_KEYS[match.type ?? ''];
      const availableKeys = Object.keys(match.data ?? {});
      const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
      initialSecret = { ...match, invalid };
    }
  }

  /* eslint-disable camelcase */
  const initialValues: Partial<ConfigureSchema> & { initialSecret?: SecretSelection } = {
    ...params,
    display_name: generateReconfigureName(pipelineRun.display_name),
    ...(taskType != null && { task_type: taskType }),
    initialSecret,
  };
  /* eslint-enable camelcase */

  return <AutomlConfigurePage initialValues={initialValues} sourceRunId={runId} />;
}

export default AutomlReconfigureLoader;
