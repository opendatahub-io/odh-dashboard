import React, { useCallback, useMemo, useState } from 'react';
import { Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { getStoredPreferredProject } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { SKILL_REGISTRY_BASENAME } from './const';
import useHostRouteSync from '../shared/useHostRouteSync';
import MLflowUnavailable from '../shared/MLflowUnavailable';
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
  const { projects, preferredProject } = React.useContext(ProjectsContext);
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

  if (!workspace && projects.length > 0) {
    const defaultProject = storedProject ?? preferredProject ?? projects[0];
    // Keep the requested skill and version (e.g. a bookmarked/shared detail
    // URL without a workspace param) instead of dropping back to the list.
    // The pathname is reused as-is so an encoded `%40org%2Fname` identity
    // stays a single segment.
    const params = new URLSearchParams(search);
    params.set(WORKSPACE_QUERY_PARAM, defaultProject.metadata.name);
    return <Navigate to={`${pathname}?${params.toString()}`} replace />;
  }

  return (
    <ApplicationsPage
      loaded
      empty={false}
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
