import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem } from '@patternfly/react-core';
import { Link, matchPath, useLocation } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import GenericHorizontalBar from '~/pages/projects/components/GenericHorizontalBar';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessReview } from '~/api';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import GenericVerticalBar from '~/pages/projects/components/GenericVerticalBar';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import { PROJECT_DETAIL_ROUTES } from '~/routes';
import { AppContext } from '~/app/AppContext';
import useCheckLogoutParams from './useCheckLogoutParams';
import ProjectActions from './ProjectActions';

import './ProjectDetails.scss';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};

const ProjectDetails: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { altNav } = React.useContext(AppContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);
  const description = getDescriptionFromK8sResource(currentProject);
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  const projectSharingEnabled = useIsAreaAvailable(SupportedArea.DS_PROJECTS_PERMISSIONS).status;
  const pipelinesEnabled = useIsAreaAvailable(SupportedArea.DS_PIPELINES).status;
  const modelServingEnabled = useModelServingEnabled();
  const location = useLocation();
  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
    namespace: currentProject.metadata.name,
  });
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  useCheckLogoutParams();

  const Component = altNav ? GenericHorizontalBar : GenericVerticalBar;

  const activeSection = React.useMemo(() => {
    if (location.pathname) {
      const pathPattern = PROJECT_DETAIL_ROUTES.find((pattern) =>
        matchPath(pattern, location.pathname),
      );

      if (pathPattern) {
        const patternSplits = pathPattern.split('/');
        const sectionIndex = patternSplits.indexOf(':section?');
        if (sectionIndex) {
          const pathSplits = location.pathname.split('/');
          return pathSplits[sectionIndex];
        }
      }
    }
    return undefined;
  }, [location.pathname]);

  const breadCrumbs = React.useMemo(() => {
    const crumbs = [
      <BreadcrumbItem
        key="page"
        render={() => <Link to="/projects">Data Science Projects</Link>}
      />,
    ];

    if (location.pathname) {
      const pathSplits = location.pathname.split('/');
      for (let i = 2; i < pathSplits.length; i++) {
        if (i === pathSplits.length - 1) {
          crumbs.push(
            <BreadcrumbItem key={pathSplits[i]} isActive>
              {pathSplits[i]}
            </BreadcrumbItem>,
          );
        } else {
          crumbs.push(
            <BreadcrumbItem
              render={() => <Link to={pathSplits.slice(0, i + 1).join('/')}>{pathSplits[i]}</Link>}
            />,
          );
        }
      }
    }
    return crumbs;
  }, [location.pathname]);

  return (
    <ApplicationsPage
      title={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <HeaderIcon type={ProjectObjectType.projectContext} sectionType={SectionType.general} />
          <FlexItem>
            <ResourceNameTooltip resource={currentProject} wrap={false}>
              {displayName}
            </ResourceNameTooltip>
          </FlexItem>
        </Flex>
      }
      description={<div style={{ marginLeft: 40 }}>{description}</div>}
      breadcrumb={<Breadcrumb>{breadCrumbs}</Breadcrumb>}
      loaded={rbacLoaded}
      empty={false}
      headerAction={<ProjectActions project={currentProject} />}
    >
      <Component
        routes={PROJECT_DETAIL_ROUTES}
        activeKey={activeSection || ProjectSectionID.OVERVIEW}
        sections={[
          { id: ProjectSectionID.OVERVIEW, title: 'Overview' },
          ...(workbenchEnabled
            ? [
                {
                  id: ProjectSectionID.WORKBENCHES,
                  title: ProjectSectionTitles[ProjectSectionID.WORKBENCHES],
                },
              ]
            : []),
          ...(pipelinesEnabled
            ? [
                {
                  id: ProjectSectionID.EXPERIMENTS_AND_RUNS,
                  title: ProjectSectionTitles[ProjectSectionID.EXPERIMENTS_AND_RUNS],
                },
                {
                  id: ProjectSectionID.EXECUTIONS,
                  title: ProjectSectionTitles[ProjectSectionID.EXECUTIONS],
                },
                {
                  id: ProjectSectionID.ARTIFACTS,
                  title: ProjectSectionTitles[ProjectSectionID.ARTIFACTS],
                },
              ]
            : []),
          {
            id: ProjectSectionID.DISTRIBUTED_WORKLOADS,
            title: ProjectSectionTitles[ProjectSectionID.DISTRIBUTED_WORKLOADS],
          },
          ...(modelServingEnabled
            ? [
                {
                  id: ProjectSectionID.MODEL_DEPLOYMENTS,
                  title: ProjectSectionTitles[ProjectSectionID.MODEL_DEPLOYMENTS],
                },
              ]
            : []),
          ...(pipelinesEnabled
            ? [
                {
                  id: ProjectSectionID.PIPELINES,
                  title: ProjectSectionTitles[ProjectSectionID.PIPELINES],
                },
              ]
            : []),
          {
            id: ProjectSectionID.CONNECTIONS,
            title: ProjectSectionTitles[ProjectSectionID.CONNECTIONS],
          },
          {
            id: ProjectSectionID.CLUSTER_STORAGES,
            title: ProjectSectionTitles[ProjectSectionID.CLUSTER_STORAGES],
          },
          ...(projectSharingEnabled && allowCreate
            ? [
                {
                  id: ProjectSectionID.PERMISSIONS,
                  title: ProjectSectionTitles[ProjectSectionID.PERMISSIONS],
                },
              ]
            : []),
          ...(biasMetricsAreaAvailable && allowCreate
            ? [
                {
                  id: ProjectSectionID.SETTINGS,
                  title: ProjectSectionTitles[ProjectSectionID.SETTINGS],
                },
              ]
            : []),
        ]}
      />
    </ApplicationsPage>
  );
};

export default ProjectDetails;
