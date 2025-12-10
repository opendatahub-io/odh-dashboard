// Copyright 2023 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DashboardResource, ProjectResource, fetchJson } from '@perses-dev/core';

////////////////////////////////////////////////////////////////////////////////////////////////
// ODH Specific Code
////////////////////////////////////////////////////////////////////////////////////////////////
export const PERSES_PROXY_BASE_PATH = '/perses/api';
////////////////////////////////////////////////////////////////////////////////////////////////
// ODH Specific Code
////////////////////////////////////////////////////////////////////////////////////////////////

export const fetchPersesDashboardsMetadata = (): Promise<DashboardResource[]> => {
  const listDashboardsMetadata = '/api/v1/dashboards';
  const persesURL = `${PERSES_PROXY_BASE_PATH}${listDashboardsMetadata}`;

  return odhPersesFetchJson<DashboardResource[]>(persesURL);
};

export const fetchPersesProjects = (): Promise<ProjectResource[]> => {
  const listProjectURL = '/api/v1/projects';
  const persesURL = `${PERSES_PROXY_BASE_PATH}${listProjectURL}`;

  return odhPersesFetchJson<ProjectResource[]>(persesURL);
};

export async function odhPersesFetchJson<T>(url: string): Promise<T> {
  // Use perses fetch as base fetch call as it handles refresh tokens
  return fetchJson(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export const fetchPersesDashboard = async (
  project: string,
  dashboardName: string,
): Promise<DashboardResource> => {
  const getDashboardURL = `/api/v1/projects/${encodeURIComponent(
    project,
  )}/dashboards/${encodeURIComponent(dashboardName)}`;
  const persesURL = `${PERSES_PROXY_BASE_PATH}${getDashboardURL}`;

  return odhPersesFetchJson<DashboardResource>(persesURL);
};

/**
 * Fetch all dashboards for a specific project
 * URL: /api/v1/projects/{project}/dashboards
 */
export const fetchProjectDashboards = async (project: string): Promise<DashboardResource[]> => {
  const listDashboardsURL = `/api/v1/projects/${encodeURIComponent(project)}/dashboards`;
  const persesURL = `${PERSES_PROXY_BASE_PATH}${listDashboardsURL}`;

  return odhPersesFetchJson<DashboardResource[]>(persesURL);
};
