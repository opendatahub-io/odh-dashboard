import { featureStoreFeaturesListRoute, featureStoreRootRoute } from '../routes';

describe('routes', () => {
  describe('featureStoreFeaturesListRoute', () => {
    const baseFeaturesPath = `${featureStoreRootRoute()}/features`;

    it('returns features list path for project', () => {
      expect(featureStoreFeaturesListRoute('my-project')).toBe(`${baseFeaturesPath}/my-project`);
    });

    it('returns path without query when searchParams undefined', () => {
      expect(featureStoreFeaturesListRoute('my-project', undefined)).toBe(
        `${baseFeaturesPath}/my-project`,
      );
    });

    it('returns path without query when searchParams empty', () => {
      expect(featureStoreFeaturesListRoute('my-project', new URLSearchParams())).toBe(
        `${baseFeaturesPath}/my-project`,
      );
    });

    it('appends query string when searchParams has entries', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('featureView', 'some-view');

      expect(featureStoreFeaturesListRoute('my-project', searchParams)).toBe(
        `${baseFeaturesPath}/my-project?featureView=some-view`,
      );
    });
  });
});
