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
import { generateReconfigureName, getTaskType } from '~/app/utilities/utils';
import AutomlConfigurePage from './AutomlConfigurePage';
import { REQUIRED_CONNECTION_SECRET_KEYS } from '../utilities/const';

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

  const { data: secrets, isError: secretsError } = useQuery({
    queryKey: ['secrets', namespace, 'storage'],
    queryFn: () => getSecrets('')(namespace ?? '', 'storage')({}),
    enabled: !!namespace,
  });

  React.useEffect(() => {
    if (secretsError) {
      notification.warning(
        'Unable to load connection secrets',
        'The previously used connection secret could not be loaded. You will need to manually select a connection secret.',
      );
    }
    // notify once when the error state is reached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secretsError]);

  if (noNamespaces || invalidNamespace || pipelineRunError) {
    return (
      <ApplicationsPage
        title={<AutomlHeader />}
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

  if (!namespacesLoaded || pipelineRunPending) {
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
  let initialInputDataSecret: SecretSelection | undefined;
  if (secretName && typeof secretName === 'string' && secrets) {
    const match = secrets.find((s) => s.name === secretName);
    if (match) {
      const requiredKeys = REQUIRED_CONNECTION_SECRET_KEYS[match.type ?? ''] ?? [];
      const availableKeys = Object.keys(match.data ?? {});
      const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
      initialInputDataSecret = { ...match, invalid };
    }
  }

  /* eslint-disable camelcase */
  const { base } = createConfigureSchema();
  const parsedParams = base.partial().safeParse(params ?? {});
  const initialValues: Partial<ConfigureSchema> = {
    ...(parsedParams.success ? parsedParams.data : {}),
    display_name: generateReconfigureName(pipelineRun.display_name),
    ...(taskType != null && { task_type: taskType }),
  };
  /* eslint-enable camelcase */

  return (
    <AutomlConfigurePage
      initialValues={initialValues}
      initialInputDataSecret={initialInputDataSecret}
      sourceRunId={runId}
    />
  );
}

export default AutomlReconfigureLoader;
