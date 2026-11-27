import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { NoProjects } from '@odh-dashboard/autox-core/ui/components/feature';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
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

const NoProjectsIcon = () => <img src={emptyStateImage} alt="AutoRAG Infrastructure" />;

const LegacyProjectRedirect: React.FC = () => {
  usePreferredNamespaceRedirect();
  return null;
};

function AutoragExperimentsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const unifiedProjectSelectorEnabled = useIsAreaAvailable(
    SupportedArea.UNIFIED_PROJECT_SELECTOR,
  ).status;
  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const showEmpty = noNamespaces || invalidNamespace;

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const [experimentsListStatus, setExperimentsListStatus] =
    React.useState<AutoragExperimentsListStatus>({ loaded: false, hasExperiments: false });

  // Legacy routes use an unkeyed Outlet and can reuse this page across namespace changes,
  // so reset the previous project's header status here. UPS already remounts this page via
  // AutoragProjectRoute's namespace-keyed Outlet; retain this reset for the legacy path.
  // Use a layout effect so the reset precedes the child's passive status notification;
  // a passive reset could overwrite the new status and leave the create-run button hidden.
  React.useLayoutEffect(() => {
    setExperimentsListStatus({ loaded: false, hasExperiments: false });
  }, [namespace]);

  const showHeaderCreateRunButton =
    !showEmpty &&
    !!namespace &&
    experimentsListStatus.loaded &&
    experimentsListStatus.hasExperiments;

  const headerContent = (
    <Flex
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      alignItems={{ default: 'alignItemsCenter' }}
      className="pf-v6-u-w-100"
    >
      {!unifiedProjectSelectorEnabled && (
        <FlexItem>
          <ProjectSelectorNavigator
            namespace={namespace}
            getRedirectPath={getRedirectPath}
            showTitle
          />
        </FlexItem>
      )}
      {showHeaderCreateRunButton ? (
        <FlexItem align={{ default: 'alignRight' }}>
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
        </FlexItem>
      ) : null}
    </Flex>
  );

  return (
    <>
      {!unifiedProjectSelectorEnabled && <LegacyProjectRedirect />}
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
        <AutoragExperiments onExperimentsListStatus={setExperimentsListStatus} />
      </ApplicationsPage>
    </>
  );
}

export default AutoragExperimentsPage;
