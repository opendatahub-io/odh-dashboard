import {
  Alert,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import { NoProjects } from '@odh-dashboard/autox-core/ui/components/feature';
import { useSecretsQuery } from '@odh-dashboard/autox-core/ui/hooks';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import ProjectSelectorNavigator from '~/app/components/common/ProjectSelectorNavigator';
import AutoragExperiments, {
  type AutoragExperimentsListStatus,
} from '~/app/components/experiments/AutoragExperiments';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import emptyStateImage from '~/app/bgimages/empty-state.svg';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { usePreferredNamespaceRedirect } from '~/app/hooks/usePreferredNamespaceRedirect';
import { autoragConfigurePathname, autoragExperimentsPathname } from '~/app/utilities/routes';
import type { SecretListItem } from '~/app/types';

const NoProjectsIcon = () => <img src={emptyStateImage} alt="AutoRAG Infrastructure" />;

type DependencyStatus = 'checking' | 'unknown' | 'configured' | 'missing';

type SecretQueryStatus = {
  data?: SecretListItem[];
  isPending: boolean;
  isError: boolean;
};

const getDependencyStatus = (
  queries: SecretQueryStatus[],
  isConfigured: boolean,
): DependencyStatus => {
  if (isConfigured) {
    return 'configured';
  }
  if (queries.some((query) => query.isPending)) {
    return 'checking';
  }
  if (queries.some((query) => query.isError)) {
    return 'unknown';
  }
  return 'missing';
};

const dependencyStatusLabel: Record<
  DependencyStatus,
  { color: 'blue' | 'green' | 'orange' | 'red'; text: string }
> = {
  checking: { color: 'blue', text: 'Checking' },
  unknown: { color: 'red', text: 'Unable to verify' },
  configured: { color: 'green', text: 'Configured' },
  missing: { color: 'orange', text: 'Not configured' },
};

type PrerequisiteStatusProps = {
  vectorStore: DependencyStatus;
  maasEndpoint: DependencyStatus;
};

const AutoRAGPrerequisiteStatus: React.FC<PrerequisiteStatusProps> = ({
  vectorStore,
  maasEndpoint,
}) => {
  const statuses = [vectorStore, maasEndpoint];
  if (statuses.every((status) => status === 'configured')) {
    return null;
  }

  const hasUnknown = statuses.includes('unknown');
  const isChecking = statuses.includes('checking');
  const missing: string[] = [];
  if (vectorStore === 'missing') {
    missing.push('a vector store backend');
  }
  if (maasEndpoint === 'missing') {
    missing.push('a MaaS endpoint');
  }

  let message = `Configure ${missing.join(' and ')} in this project before creating an AutoRAG run.`;
  let title = 'AutoRAG prerequisites need attention';
  let alertVariant: 'danger' | 'info' | 'warning' = 'warning';
  if (hasUnknown) {
    message =
      'One or more connection statuses could not be checked. Refresh the page to try again.';
    title = 'Could not verify AutoRAG prerequisites';
    alertVariant = 'danger';
  } else if (isChecking) {
    message = 'Checking connections in this project.';
    title = 'Checking AutoRAG prerequisites';
    alertVariant = 'info';
  }

  return (
    <Alert variant={alertVariant} isInline title={title} data-testid="autorag-prerequisite-status">
      <p>{message}</p>
      <DescriptionList isHorizontal isCompact>
        <DescriptionListGroup data-testid="autorag-vector-store-status">
          <DescriptionListTerm>Vector store backend</DescriptionListTerm>
          <DescriptionListDescription>
            <Label color={dependencyStatusLabel[vectorStore].color}>
              {dependencyStatusLabel[vectorStore].text}
            </Label>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup data-testid="autorag-maas-status">
          <DescriptionListTerm>MaaS endpoint</DescriptionListTerm>
          <DescriptionListDescription>
            <Label color={dependencyStatusLabel[maasEndpoint].color}>
              {dependencyStatusLabel[maasEndpoint].text}
            </Label>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </Alert>
  );
};

function AutoragExperimentsPage(): React.JSX.Element {
  usePreferredNamespaceRedirect();

  const navigate = useNavigate();
  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const showEmpty = noNamespaces || invalidNamespace;
  const prerequisiteNamespace = showEmpty ? undefined : namespace;
  const vectorStoreSecrets = useSecretsQuery(prerequisiteNamespace, 'vector-db');
  const databaseSecrets = useSecretsQuery(prerequisiteNamespace, 'database');
  const maasSecrets = useSecretsQuery(prerequisiteNamespace, 'maas');

  const vectorStoreStatus = getDependencyStatus(
    [vectorStoreSecrets, databaseSecrets],
    (vectorStoreSecrets.data?.length ?? 0) > 0 || (databaseSecrets.data?.length ?? 0) > 0,
  );
  const maasEndpointStatus = getDependencyStatus(
    [maasSecrets],
    (maasSecrets.data?.length ?? 0) > 0,
  );
  const canCreateRun = vectorStoreStatus === 'configured' && maasEndpointStatus === 'configured';
  const missingPrerequisites: string[] = [];
  if (vectorStoreStatus === 'missing') {
    missingPrerequisites.push('a vector store backend');
  }
  if (maasEndpointStatus === 'missing') {
    missingPrerequisites.push('a MaaS endpoint');
  }
  let createRunDisabledReason: string;
  if (vectorStoreStatus === 'checking' || maasEndpointStatus === 'checking') {
    createRunDisabledReason = 'AutoRAG prerequisites are still being checked.';
  } else if (vectorStoreStatus === 'unknown' || maasEndpointStatus === 'unknown') {
    createRunDisabledReason =
      'AutoRAG prerequisites could not be verified. Refresh the page and try again.';
  } else {
    createRunDisabledReason = `Configure ${missingPrerequisites.join(' and ')} in this project before creating an AutoRAG run.`;
  }

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const [experimentsListStatus, setExperimentsListStatus] =
    React.useState<AutoragExperimentsListStatus>({ loaded: false, hasExperiments: false });

  // When the route namespace changes, drop prior list status so the header cannot briefly reflect
  // the previous project. useLayoutEffect runs before paint and before child useEffect; a passive
  // useEffect here can run after AutoragExperiments has already reported the new namespace and
  // overwrite correct state (header button stuck hidden).

  React.useLayoutEffect(() => {
    setExperimentsListStatus({ loaded: false, hasExperiments: false });
  }, [namespace]);

  const showHeaderCreateRunButton =
    !showEmpty &&
    !!namespace &&
    experimentsListStatus.loaded &&
    experimentsListStatus.hasExperiments;

  const headerContent = (
    <Stack hasGutter>
      <StackItem>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          className="pf-v6-u-w-100"
        >
          <FlexItem>
            <ProjectSelectorNavigator
              namespace={namespace}
              getRedirectPath={getRedirectPath}
              showTitle
            />
          </FlexItem>
          {showHeaderCreateRunButton ? (
            <FlexItem>
              {canCreateRun ? (
                <Button
                  variant="primary"
                  data-testid="autorag-header-create-run-button"
                  onClick={() => {
                    if (namespace) {
                      navigate(`${autoragConfigurePathname}/${namespace}`);
                    }
                  }}
                >
                  Create AutoRAG optimization run
                </Button>
              ) : (
                <Tooltip content={createRunDisabledReason}>
                  <span>
                    <Button
                      variant="primary"
                      data-testid="autorag-header-create-run-button"
                      isDisabled
                    >
                      Create AutoRAG optimization run
                    </Button>
                  </span>
                </Tooltip>
              )}
            </FlexItem>
          ) : null}
        </Flex>
      </StackItem>
      {namespace && !showEmpty ? (
        <StackItem>
          <AutoRAGPrerequisiteStatus
            vectorStore={vectorStoreStatus}
            maasEndpoint={maasEndpointStatus}
          />
        </StackItem>
      ) : null}
    </Stack>
  );

  return (
    <ApplicationsPage
      title={<AutoragHeader />}
      headerContent={headerContent}
      description={
        <p>
          Automatically test and tune retrieval, indexing, and model settings to improve
          Retrieval-Augmented Generation (RAG) response quality.
        </p>
      }
      empty={showEmpty}
      emptyStatePage={
        noNamespaces ? (
          <NoProjects productName="AutoRAG" icon={NoProjectsIcon} />
        ) : (
          <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
        )
      }
      loadError={namespacesLoadError}
      loaded={namespacesLoaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoragExperiments
        onExperimentsListStatus={setExperimentsListStatus}
        canCreateRun={canCreateRun}
        createRunDisabledReason={createRunDisabledReason}
      />
    </ApplicationsPage>
  );
}

export default AutoragExperimentsPage;
