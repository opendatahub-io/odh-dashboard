import buildURL, { type URLParams } from '../url-builder';

describe('buildURL', () => {
  describe('basePath', () => {
    it('should always prepend /perses/api basePath', () => {
      const result = buildURL({ resource: 'dashboards' });

      expect(result).toMatch(/^\/perses\/api/);
    });
  });

  describe('apiPrefix', () => {
    it('should use default apiPrefix /api/v1 when not specified', () => {
      const result = buildURL({ resource: 'dashboards' });

      expect(result).toBe('/perses/api/api/v1/dashboards');
    });

    it('should use custom apiPrefix when specified', () => {
      const result = buildURL({ resource: 'dashboards', apiPrefix: '/api/v2' });

      expect(result).toBe('/perses/api/api/v2/dashboards');
    });

    it('should use empty string apiPrefix when explicitly set to empty', () => {
      const result = buildURL({ resource: 'dashboards', apiPrefix: '' });

      expect(result).toBe('/perses/api/dashboards');
    });
  });

  describe('resource', () => {
    it('should append resource to the URL', () => {
      const result = buildURL({ resource: 'datasources' });

      expect(result).toBe('/perses/api/api/v1/datasources');
    });

    it('should handle different resource types', () => {
      expect(buildURL({ resource: 'projects' })).toBe('/perses/api/api/v1/projects');
      expect(buildURL({ resource: 'globaldatasources' })).toBe(
        '/perses/api/api/v1/globaldatasources',
      );
    });
  });

  describe('project', () => {
    it('should include project in the URL path when provided', () => {
      const result = buildURL({ resource: 'dashboards', project: 'my-project' });

      expect(result).toBe('/perses/api/api/v1/projects/my-project/dashboards');
    });

    it('should encode special characters in project name', () => {
      const result = buildURL({ resource: 'dashboards', project: 'my project/special' });

      expect(result).toBe('/perses/api/api/v1/projects/my%20project%2Fspecial/dashboards');
    });

    it('should not include project segment when project is undefined', () => {
      const result = buildURL({ resource: 'dashboards' });

      expect(result).not.toContain('projects');
    });

    it('should not include project segment when project is empty string', () => {
      const result = buildURL({ resource: 'dashboards', project: '' });

      expect(result).not.toContain('projects');
    });
  });

  describe('name', () => {
    it('should append name to the URL when provided', () => {
      const result = buildURL({ resource: 'dashboards', name: 'my-dashboard' });

      expect(result).toBe('/perses/api/api/v1/dashboards/my-dashboard');
    });

    it('should encode special characters in name', () => {
      const result = buildURL({ resource: 'dashboards', name: 'dash board&test' });

      expect(result).toBe('/perses/api/api/v1/dashboards/dash%20board%26test');
    });

    it('should not append name segment when name is undefined', () => {
      const result = buildURL({ resource: 'dashboards' });

      expect(result).toBe('/perses/api/api/v1/dashboards');
    });

    it('should not append name segment when name is empty string', () => {
      const result = buildURL({ resource: 'dashboards', name: '' });

      expect(result).toBe('/perses/api/api/v1/dashboards');
    });
  });

  describe('pathSuffix', () => {
    it('should append path suffix segments to the URL', () => {
      const result = buildURL({ resource: 'dashboards', pathSuffix: ['panels', 'chart-1'] });

      expect(result).toBe('/perses/api/api/v1/dashboards/panels/chart-1');
    });

    it('should not append path suffix when array is empty', () => {
      const result = buildURL({ resource: 'dashboards', pathSuffix: [] });

      expect(result).toBe('/perses/api/api/v1/dashboards');
    });

    it('should not append path suffix when undefined', () => {
      const result = buildURL({ resource: 'dashboards' });

      expect(result).toBe('/perses/api/api/v1/dashboards');
    });
  });

  describe('queryParams', () => {
    it('should append query parameters to the URL', () => {
      const queryParams = new URLSearchParams();
      queryParams.append('kind', 'PrometheusDatasource');
      queryParams.append('default', 'true');

      const result = buildURL({ resource: 'datasources', queryParams });

      expect(result).toBe('/perses/api/api/v1/datasources?kind=PrometheusDatasource&default=true');
    });

    it('should not append query string when queryParams is undefined', () => {
      const result = buildURL({ resource: 'dashboards' });

      expect(result).not.toContain('?');
    });
  });

  describe('combined params', () => {
    it('should build a complete URL with project, name, pathSuffix, and queryParams', () => {
      const params: URLParams = {
        resource: 'datasources',
        project: 'opendatahub',
        name: 'thanos',
        pathSuffix: ['proxy'],
        queryParams: new URLSearchParams({ query: 'up' }),
      };

      const result = buildURL(params);

      expect(result).toBe(
        '/perses/api/api/v1/projects/opendatahub/datasources/thanos/proxy?query=up',
      );
    });

    it('should build URL with project and custom apiPrefix', () => {
      const result = buildURL({
        resource: 'dashboards',
        project: 'test-project',
        apiPrefix: '/api/v2',
      });

      expect(result).toBe('/perses/api/api/v2/projects/test-project/dashboards');
    });
  });
});
