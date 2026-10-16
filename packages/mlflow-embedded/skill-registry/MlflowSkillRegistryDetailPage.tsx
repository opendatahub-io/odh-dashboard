import React, { useCallback, useMemo, useState } from 'react';
import { Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { byName } from '@odh-dashboard/k8s-core';
import InvalidProject from '@odh-dashboard/ui-core/components/InvalidProject';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { SKILL_REGISTRY_BASENAME, skillRegistryBaseRoute } from './const';
import useHostRouteSync from '../shared/useHostRouteSync';
import MLflowUnavailable from '../shared/MLflowUnavailable';
import NoProjectsEmptyState from '../shared/NoProjectsEmptyState';
import MlflowBreadcrumbs, { BreadcrumbEntry } from '../shared/MlflowBreadcrumbs';

/**
 * Full-screen breakout for a single skill's detail page.
 *
 * Registered as standalone `app.route`s (see extensions.ts) so it renders
 * outside of the "Skills" tab page shell (no page title). The remote reports
 * breadcrumb segments (with the `@organization/name` identity) via
 * `onBreadcrumbChange`; its own internal breadcrumb is hidden when embedded
 * so only this host-rendered one shows.
 */
const MlflowSkillRegistryDetailPage: React.FC = () => {
  const { pathname, search } = useLocation();
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get(WORKSPACE_QUERY_PARAM) ?? '';
  const {
    projects,
    preferredProject,
    loaded: projectsLoaded,
    loadError: projectsLoadError,
  } = React.useContext(ProjectsContext);
  const storedProject = getStoredPreferredProject(projects);
  const syncHostRoute = useHostRouteSync();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);

  const handleBreadcrumbChange = useCallback(
    (segments: BreadcrumbEntry[]) => {
      syncHostRoute();
      setBreadcrumbs(segments);
    },
    [syncHostRoute],
  );

  const loadWrapper = useMemo(
    () => () =>
      loadRemote<{ default: React.ComponentType }>('mlflowEmbedded/MlflowSkillRegistryWrapper')
        .then((mod) => mod ?? { default: MLflowUnavailable })
        .catch(() => ({ default: MLflowUnavailable })),
    [],
  );

  // Keep the requested skill and version (e.g. a bookmarked/shared detail
  // URL without a workspace param, or one pointing at a project the user
  // can't see) instead of dropping back to the list. The pathname is reused
  // as-is so an encoded `%40org%2Fname` identity stays a single segment.
  const getDetailPath = useCallback(
    (namespace: string) => {
      const params = new URLSearchParams(search);
      params.set(WORKSPACE_QUERY_PARAM, namespace);
      return `${pathname}?${params.toString()}`;
    },
    [pathname, search],
  );

  if (!workspace && projects.length > 0) {
    const defaultProject = storedProject ?? preferredProject ?? projects[0];
    return <Navigate to={getDetailPath(defaultProject.metadata.name)} replace />;
  }

  let emptyStatePage: React.ReactNode;
  if (projects.length === 0) {
    emptyStatePage = (
      <PageSection hasBodyWrapper={false} isFilled>
        <NoProjectsEmptyState
          message="To register a skill, first create a project."
          testId="skill-registry-no-projects-empty-state"
          getRedirectPath={skillRegistryBaseRoute}
        />
      </PageSection>
    );
  } else if (!projects.find(byName(workspace))) {
    emptyStatePage = (
      <PageSection hasBodyWrapper={false} isFilled>
        <InvalidProject namespace={workspace} getRedirectPath={getDetailPath} />
      </PageSection>
    );
  }

  return (
    <ApplicationsPage
      loaded={projectsLoaded || !!projectsLoadError}
      empty={!!emptyStatePage}
      emptyStatePage={emptyStatePage}
      noHeader
      breadcrumb={
        breadcrumbs.length > 0 ? (
          <MlflowBreadcrumbs
            basePath={SKILL_REGISTRY_BASENAME}
            workspace={workspace}
            breadcrumbs={breadcrumbs}
          />
        ) : undefined
      }
      keepBodyWrapper={false}
    >
      <LazyCodeRefComponent
        key={workspace}
        component={loadWrapper}
        props={{
          basename: SKILL_REGISTRY_BASENAME,
          onBreadcrumbChange: handleBreadcrumbChange,
        }}
        fallback={
          <PageSection hasBodyWrapper={false}>
            <Bullseye>
              <Spinner />
            </Bullseye>
          </PageSection>
        }
      />
    </ApplicationsPage>
  );
};

export default MlflowSkillRegistryDetailPage;
