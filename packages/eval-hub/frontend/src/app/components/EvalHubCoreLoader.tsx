import * as React from 'react';
import { Content, Flex, FlexItem } from '@patternfly/react-core';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import EvalHubNoProjects from './EvalHubNoProjects';
import EvalHubInvalidProject from './EvalHubInvalidProject';
import EvalHubHeader from './EvalHubHeader';
import EvalHubProjectSelector from './EvalHubProjectSelector';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;
type EmptyStateProps = 'emptyStatePage' | 'empty';

type EvalHubCoreLoaderProps = {
  getInvalidRedirectPath: (namespace: string) => string;
};

type ApplicationPageRenderState = Pick<ApplicationPageProps, EmptyStateProps>;

const EvalHubCoreLoader: React.FC<EvalHubCoreLoaderProps> = ({ getInvalidRedirectPath }) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { namespaces, namespacesLoaded, preferredNamespace } = useNamespaceSelector();

  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (namespaces.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: <EvalHubNoProjects />,
    };
  } else if (namespace) {
    const foundProject = namespaces.find((n) => n.name === namespace);
    if (foundProject) {
      return <Outlet />;
    }

    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <EvalHubInvalidProject namespace={namespace} getRedirectPath={getInvalidRedirectPath} />
      ),
    };
  } else {
    const redirectNamespace = preferredNamespace ?? namespaces[0];
    return <Navigate to={getInvalidRedirectPath(redirectNamespace.name)} replace />;
  }

  return (
    <ApplicationsPage
      {...renderStateProps}
      title={<EvalHubHeader title="Evaluations" />}
      description="Run evaluations on models, agents, and datasets to optimize performance."
      headerContent={
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
          <ProjectIconWithSize size={IconSize.LG} />
          <FlexItem>
            <Content component="p">Project</Content>
          </FlexItem>
          <FlexItem>
            <EvalHubProjectSelector
              namespace={namespace}
              getRedirectPath={getInvalidRedirectPath}
            />
          </FlexItem>
        </Flex>
      }
      loaded={namespacesLoaded}
      provideChildrenPadding
    />
  );
};

export default EvalHubCoreLoader;
