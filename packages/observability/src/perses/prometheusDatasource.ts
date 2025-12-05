import { DatasourceResource, GlobalDatasourceResource } from '@perses-dev/core';
import { DatasourceApi } from '@perses-dev/dashboards';

/**
 * Backend API base path for Prometheus queries.
 * This connects to the dashboard backend which proxies requests to Thanos/Prometheus.
 */
const PROMETHEUS_API_BASE = '/api/prometheus';

/**
 * Datasource API implementation that connects to the ODH Dashboard backend.
 * The backend handles authentication and proxies requests to Thanos/Prometheus.
 */
export class PrometheusDatasourceApi implements DatasourceApi {
  private prometheusDatasource: GlobalDatasourceResource = {
    kind: 'GlobalDatasource',
    metadata: {
      name: 'prometheus',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    spec: {
      default: true,
      plugin: {
        kind: 'PrometheusDatasource',
        spec: {
          // Use the backend proxy URL
          directUrl: PROMETHEUS_API_BASE,
        },
      },
    },
  };

  getDatasource = async (
    project: string,
    // _selector: DatasourceSelector,
  ): Promise<DatasourceResource | undefined> => {
    return {
      kind: 'Datasource',
      metadata: {
        name: 'prometheus',
        project,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      },
      spec: this.prometheusDatasource.spec,
    };
  };

  getGlobalDatasource = async (): // _selector: DatasourceSelector,
  Promise<GlobalDatasourceResource | undefined> => {
    return this.prometheusDatasource;
  };

  listDatasources = async (
    project: string,
    // _pluginKind?: string,
  ): Promise<DatasourceResource[]> => {
    return [
      {
        kind: 'Datasource',
        metadata: {
          name: 'prometheus',
          project,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        },
        spec: this.prometheusDatasource.spec,
      },
    ];
  };

  listGlobalDatasources = async (/*_pluginKind?: string*/): Promise<GlobalDatasourceResource[]> => {
    return [this.prometheusDatasource];
  };
}
