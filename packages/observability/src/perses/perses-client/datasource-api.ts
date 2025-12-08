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

import { DatasourceResource, DatasourceSelector, GlobalDatasourceResource } from '@perses-dev/core';
import { BuildDatasourceProxyUrlFunc, DatasourceApi } from '@perses-dev/dashboards';
import { fetchDatasourceList } from './datasource-client';
import { fetchGlobalDatasourceList } from './global-datasource-client';
import { PERSES_PROXY_BASE_PATH } from './perses-client';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class Cache {
  private datasources: Map<string, CacheEntry<DatasourceResource>>;

  private emptyDatasources: Map<string, CacheEntry<boolean>>;

  private globalDatasources: Map<string, CacheEntry<GlobalDatasourceResource>>;

  private ttl: number;

  constructor() {
    // Cache expiration set to 5min
    this.ttl = 5 * 60 * 1000;
    this.globalDatasources = new Map();
    this.datasources = new Map();
    this.emptyDatasources = new Map();
  }

  private isExpired(entry: CacheEntry<unknown> | undefined): boolean {
    if (!entry) {
      return true;
    }
    return Date.now() - entry.timestamp > this.ttl;
  }

  setDatasources(list: DatasourceResource[]): void {
    for (const dts of list) {
      this.setDatasource(dts);
    }
  }

  setDatasource(dts: DatasourceResource): void {
    const { kind } = dts.spec.plugin;
    const { project } = dts.metadata;
    const entry = { value: dts, timestamp: Date.now() };
    if (dts.spec.default) {
      // in case it's the default datasource for the given kind, we store it twice
      // because we might get the datasource with the name or because we want the default one.
      this.datasources.set(this.generateKey({ kind }, project), entry);
    }
    this.datasources.set(this.generateKey({ kind, name: dts.metadata.name }, project), entry);
  }

  setUndefinedDatasource(project: string, selector: DatasourceSelector): void {
    this.emptyDatasources.set(this.generateKey(selector, project), {
      value: true,
      timestamp: Date.now(),
    });
  }

  getDatasource(
    project: string,
    selector: DatasourceSelector,
  ): { resource: DatasourceResource | undefined; keyExist: boolean } {
    const key = this.generateKey(selector, project);
    const entry = this.datasources.get(key);
    if (entry && !this.isExpired(entry)) {
      return { resource: entry.value, keyExist: true };
    }
    const emptyEntry = this.emptyDatasources.get(key);
    if (emptyEntry && !this.isExpired(emptyEntry)) {
      return { resource: undefined, keyExist: true };
    }
    return { resource: undefined, keyExist: false };
  }

  setGlobalDatasources(list: GlobalDatasourceResource[]): void {
    for (const dts of list) {
      this.setGlobalDatasource(dts);
    }
  }

  setGlobalDatasource(dts: GlobalDatasourceResource): void {
    const { kind } = dts.spec.plugin;
    const entry = { value: dts, timestamp: Date.now() };
    if (dts.spec.default) {
      // in case it's the default datasource for the given kind, we store it twice
      // because we might get the datasource with the name or because we want the default one.
      this.globalDatasources.set(this.generateKey({ kind }), entry);
    }
    this.globalDatasources.set(this.generateKey({ kind, name: dts.metadata.name }), entry);
  }

  setUndefinedGlobalDatasource(selector: DatasourceSelector): void {
    this.emptyDatasources.set(this.generateKey(selector), { value: true, timestamp: Date.now() });
  }

  getGlobalDatasource(selector: DatasourceSelector): {
    resource: GlobalDatasourceResource | undefined;
    keyExist: boolean;
  } {
    const key = this.generateKey(selector);
    const entry = this.globalDatasources.get(key);
    if (entry && !this.isExpired(entry)) {
      return { resource: entry.value, keyExist: true };
    }
    const emptyEntry = this.emptyDatasources.get(key);
    if (emptyEntry && !this.isExpired(emptyEntry)) {
      return { resource: undefined, keyExist: true };
    }
    return { resource: undefined, keyExist: false };
  }

  private generateKey(selector: DatasourceSelector, project?: string): string {
    let key = selector.kind;
    if (selector.name !== undefined) {
      key += `-${selector.name}`;
    }
    if (project !== undefined) {
      key += `-${project}`;
    }
    return key;
  }
}

// TODO: Move to tanstack query for caching
export class CachedDatasourceAPI implements DatasourceApi {
  private readonly client: DatasourceApi;

  private readonly cache: Cache;

  public buildProxyUrl?: BuildDatasourceProxyUrlFunc;

  constructor(client: DatasourceApi) {
    this.client = client;
    this.cache = new Cache();
    this.buildProxyUrl = this.client.buildProxyUrl?.bind(this.client);
  }

  getDatasource(
    project: string,
    selector: DatasourceSelector,
  ): Promise<DatasourceResource | undefined> {
    const { resource, keyExist } = this.cache.getDatasource(project, selector);
    if (resource) {
      return Promise.resolve(resource);
    }
    if (keyExist) {
      // in case the keyExist, then it means we already did the query,
      // but the datasource doesn't exist. So we can safely return an undefined Promise.
      return Promise.resolve(undefined);
    }
    return this.client.getDatasource(project, selector).then((result?: DatasourceResource) => {
      if (result === undefined) {
        // in case the result is undefined, we should then notify
        // that the datasource doesn't exist for the given selector.
        // Like that, next time another panel ask for the exact same
        // datasource (with the same selector), then we won't query the server to try it again.
        // It's ok to do it as the cache has an expiration of 5min.
        // We have the same logic for the globalDatasources.
        this.cache.setUndefinedDatasource(project, selector);
      } else {
        this.cache.setDatasource(result);
      }
      return result;
    });
  }

  getGlobalDatasource(selector: DatasourceSelector): Promise<GlobalDatasourceResource | undefined> {
    const { resource, keyExist } = this.cache.getGlobalDatasource(selector);
    if (resource) {
      return Promise.resolve(resource);
    }
    if (keyExist) {
      return Promise.resolve(undefined);
    }
    return this.client.getGlobalDatasource(selector).then((result?: GlobalDatasourceResource) => {
      if (result === undefined) {
        this.cache.setUndefinedGlobalDatasource(selector);
      } else {
        this.cache.setGlobalDatasource(result);
      }
      return result;
    });
  }

  listDatasources(project: string, pluginKind?: string): Promise<DatasourceResource[]> {
    return this.client.listDatasources(project, pluginKind).then((list: DatasourceResource[]) => {
      this.cache.setDatasources(list);
      return list;
    });
  }

  listGlobalDatasources(pluginKind?: string): Promise<GlobalDatasourceResource[]> {
    return this.client
      .listGlobalDatasources(pluginKind)
      .then((list: GlobalDatasourceResource[]) => {
        this.cache.setGlobalDatasources(list);
        return list;
      });
  }
}

/**
 * ODH Dashboard Datasource API implementation.
 * Fetches datasource configurations from Perses through the backend proxy.
 */
export class OdhDatasourceApi implements DatasourceApi {
  constructor(public basePath: string = PERSES_PROXY_BASE_PATH) {}

  /**
   * Build proxy URL for datasource queries.
   * Routes: /proxy/globaldatasources/{name} or /proxy/projects/{project}/datasources/{name}
   */
  buildProxyUrl({
    project,
    dashboard,
    name,
  }: {
    project?: string;
    dashboard?: string;
    name: string;
  }): string {
    let path = project || dashboard ? 'datasources' : 'globaldatasources';
    path += `/${encodeURIComponent(name)}`;
    if (dashboard) {
      path = `dashboards/${encodeURIComponent(dashboard)}/${path}`;
    }
    if (project) {
      path = `projects/${encodeURIComponent(project)}/${path}`;
    }
    return `${this.basePath}/proxy/${path}`;
  }

  getDatasource = async (
    project: string,
    selector: DatasourceSelector,
  ): Promise<DatasourceResource | undefined> => {
    return fetchDatasourceList(
      project,
      selector.kind,
      selector.name ? undefined : true,
      selector.name,
    ).then((list) => {
      if (!Array.isArray(list) || list.length === 0) {
        return undefined;
      }
      return list[0];
    });
  };

  getGlobalDatasource = async (
    selector: DatasourceSelector,
  ): Promise<GlobalDatasourceResource | undefined> => {
    return fetchGlobalDatasourceList(
      selector.kind,
      selector.name ? undefined : true,
      selector.name,
    ).then((list) => {
      if (!Array.isArray(list) || list.length === 0) {
        return undefined;
      }
      return list[0];
    });
  };

  listDatasources(project: string, pluginKind?: string): Promise<DatasourceResource[]> {
    return fetchDatasourceList(project, pluginKind);
  }

  listGlobalDatasources(pluginKind?: string): Promise<GlobalDatasourceResource[]> {
    return fetchGlobalDatasourceList(pluginKind);
  }
}
