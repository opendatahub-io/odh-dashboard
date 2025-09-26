import { getFeatureStoreRoute, groupResultsByCategory } from '../searchUtils';
import { FEATURE_STORE_TYPE_TO_CATEGORY } from '../../const';
import type { ISearchItem } from '../../hooks/useSearchHandlers';

const TEST_PROJECTS = {
  PRIMARY: 'credit_scoring_local',
  SECONDARY: 'rbac',
  PROJECT_A: 'project-a',
  PROJECT_B: 'project-b',
  DEFAULT: 'test-project',
} as const;

describe('searchUtils', () => {
  describe('getFeatureStoreRoute test cases', () => {
    const testProject = TEST_PROJECTS.DEFAULT;
    const testName = 'test-name';

    it('should return entity route for entity type', () => {
      const result = getFeatureStoreRoute('entity', testProject, testName);
      expect(result).toBe(`/featureStore/entities/${testProject}/${testName}`);
    });

    it('should return data source route for dataSource type', () => {
      const result = getFeatureStoreRoute('dataSource', testProject, testName);
      expect(result).toBe(`/featureStore/dataSources/${testProject}/${testName}`);
    });

    it('should return features route for feature type', () => {
      const result = getFeatureStoreRoute('feature', testProject, testName);
      expect(result).toBe(`/featureStore/features/${testProject}`);
    });

    it('should return feature view route for featureView type', () => {
      const result = getFeatureStoreRoute('featureView', testProject, testName);
      expect(result).toBe(`/featureStore/featureViews/${testProject}/${testName}`);
    });

    it('should return feature service route for featureService type', () => {
      const result = getFeatureStoreRoute('featureService', testProject, testName);
      expect(result).toBe(`/featureStore/featureServices/${testProject}/${testName}`);
    });

    it('should return default route for unknown type', () => {
      const result = getFeatureStoreRoute('unknown', testProject, testName);
      expect(result).toBe(`/featureStore/${testProject}`);
    });

    it('should return default route for empty type', () => {
      const result = getFeatureStoreRoute('', testProject, testName);
      expect(result).toBe(`/featureStore/${testProject}`);
    });

    it('should handle special characters in project and name', () => {
      const specialProject = 'project-with-dashes_and_underscores';
      const specialName = 'name-with-special_chars';

      const result = getFeatureStoreRoute('entity', specialProject, specialName);
      expect(result).toBe(`/featureStore/entities/${specialProject}/${specialName}`);
    });
  });

  describe('groupResultsByCategory test cases', () => {
    const createMockSearchItem = (
      id: string,
      category: string,
      title: string,
      type: string,
      project: string = TEST_PROJECTS.DEFAULT,
    ): ISearchItem => ({
      id,
      category,
      title,
      description: `Description for ${title}`,
      type,
      project,
    });

    const createRealisticMockData = (): ISearchItem[] => [
      {
        id: '1',
        category: FEATURE_STORE_TYPE_TO_CATEGORY.dataSource,
        title: 'Loan table',
        description: 'Loan application data including personal and loan characteristics',
        type: 'dataSource',
        project: TEST_PROJECTS.PRIMARY,
      },
      {
        id: '2',
        category: FEATURE_STORE_TYPE_TO_CATEGORY.featureView,
        title: 'loan_features',
        description: 'Loan application characteristics and terms for risk evaluation',
        type: 'featureView',
        project: TEST_PROJECTS.PRIMARY,
      },
      {
        id: '3',
        category: FEATURE_STORE_TYPE_TO_CATEGORY.feature,
        title: 'credit_card_due',
        description: 'Outstanding credit card balance',
        type: 'feature',
        project: TEST_PROJECTS.PRIMARY,
      },
      {
        id: '4',
        category: FEATURE_STORE_TYPE_TO_CATEGORY.featureService,
        title: 'driver_activity_v1',
        description: '',
        type: 'featureService',
        project: TEST_PROJECTS.SECONDARY,
      },
      {
        id: '5',
        category: FEATURE_STORE_TYPE_TO_CATEGORY.entity,
        title: 'loan_id',
        description: 'Unique identifier for each loan application',
        type: 'entity',
        project: TEST_PROJECTS.PRIMARY,
      },
    ];

    it('should return empty array for empty input', () => {
      const result = groupResultsByCategory([]);
      expect(result).toEqual([]);
    });

    it('should group single item correctly', () => {
      const items = [
        createMockSearchItem('1', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity 1', 'entity'),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toEqual([
        {
          category: FEATURE_STORE_TYPE_TO_CATEGORY.entity,
          items: [items[0]],
        },
      ]);
    });

    it('should group multiple items with same category', () => {
      const items = [
        createMockSearchItem('1', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity 1', 'entity'),
        createMockSearchItem('2', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity 2', 'entity'),
        createMockSearchItem('3', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity 3', 'entity'),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toEqual([
        {
          category: FEATURE_STORE_TYPE_TO_CATEGORY.entity,
          items,
        },
      ]);
    });

    it('should group items with different categories', () => {
      const items = [
        createMockSearchItem('1', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity 1', 'entity'),
        createMockSearchItem(
          '2',
          FEATURE_STORE_TYPE_TO_CATEGORY.featureView,
          'View 1',
          'featureView',
        ),
        createMockSearchItem(
          '3',
          FEATURE_STORE_TYPE_TO_CATEGORY.dataSource,
          'Source 1',
          'dataSource',
        ),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toHaveLength(3);
      expect(
        result.find((g) => g.category === FEATURE_STORE_TYPE_TO_CATEGORY.entity)?.items,
      ).toEqual([items[0]]);
      expect(
        result.find((g) => g.category === FEATURE_STORE_TYPE_TO_CATEGORY.featureView)?.items,
      ).toEqual([items[1]]);
      expect(
        result.find((g) => g.category === FEATURE_STORE_TYPE_TO_CATEGORY.dataSource)?.items,
      ).toEqual([items[2]]);
    });

    it('should group mixed categories with multiple items each', () => {
      const items = [
        createMockSearchItem('1', 'Entities', 'Entity 1', 'entity'),
        createMockSearchItem('2', 'Feature views', 'View 1', 'featureView'),
        createMockSearchItem('3', 'Entities', 'Entity 2', 'entity'),
        createMockSearchItem('4', 'Feature views', 'View 2', 'featureView'),
        createMockSearchItem('5', 'Data sources', 'Source 1', 'dataSource'),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toHaveLength(3);

      const entitiesGroup = result.find((g) => g.category === 'Entities');
      expect(entitiesGroup?.items).toEqual([items[0], items[2]]);

      const viewsGroup = result.find((g) => g.category === 'Feature views');
      expect(viewsGroup?.items).toEqual([items[1], items[3]]);

      const sourcesGroup = result.find((g) => g.category === 'Data sources');
      expect(sourcesGroup?.items).toEqual([items[4]]);
    });

    it('should preserve item order within categories', () => {
      const items = [
        createMockSearchItem('1', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity A', 'entity'),
        createMockSearchItem('2', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity B', 'entity'),
        createMockSearchItem('3', FEATURE_STORE_TYPE_TO_CATEGORY.entity, 'Entity C', 'entity'),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toHaveLength(1);
      const entitiesGroup = result[0];
      expect(entitiesGroup.category).toBe(FEATURE_STORE_TYPE_TO_CATEGORY.entity);
      expect(entitiesGroup.items).toHaveLength(3);

      entitiesGroup.items.forEach((item, index) => {
        const expectedTitles = ['Entity A', 'Entity B', 'Entity C'];
        expect(item.title).toBe(expectedTitles[index]);
      });
    });

    it('should handle items with same category but different projects', () => {
      const items = [
        createMockSearchItem(
          '1',
          FEATURE_STORE_TYPE_TO_CATEGORY.entity,
          'Entity 1',
          'entity',
          TEST_PROJECTS.PROJECT_A,
        ),
        createMockSearchItem(
          '2',
          FEATURE_STORE_TYPE_TO_CATEGORY.entity,
          'Entity 2',
          'entity',
          TEST_PROJECTS.PROJECT_B,
        ),
        createMockSearchItem(
          '3',
          FEATURE_STORE_TYPE_TO_CATEGORY.entity,
          'Entity 3',
          'entity',
          TEST_PROJECTS.PROJECT_A,
        ),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toHaveLength(1);
      const entitiesGroup = result[0];
      expect(entitiesGroup.category).toBe(FEATURE_STORE_TYPE_TO_CATEGORY.entity);
      expect(entitiesGroup.items).toHaveLength(3);
      const projects = entitiesGroup.items.map((item) => item.project);
      expect(projects).toEqual([
        TEST_PROJECTS.PROJECT_A,
        TEST_PROJECTS.PROJECT_B,
        TEST_PROJECTS.PROJECT_A,
      ]);

      expect(projects).toContain(TEST_PROJECTS.PROJECT_A);
      expect(projects).toContain(TEST_PROJECTS.PROJECT_B);
    });

    it('should handle categories with special characters', () => {
      const items = [
        createMockSearchItem('1', 'Category-with-dashes', 'Item 1', 'type1'),
        createMockSearchItem('2', 'Category_with_underscores', 'Item 2', 'type2'),
        createMockSearchItem('3', 'Category with spaces', 'Item 3', 'type3'),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toHaveLength(3);
      expect(result.find((g) => g.category === 'Category-with-dashes')).toBeDefined();
      expect(result.find((g) => g.category === 'Category_with_underscores')).toBeDefined();
      expect(result.find((g) => g.category === 'Category with spaces')).toBeDefined();
    });

    it('should handle empty category names', () => {
      const items = [
        createMockSearchItem('1', '', 'Item 1', 'type1'),
        createMockSearchItem('2', 'Normal Category', 'Item 2', 'type2'),
        createMockSearchItem('3', '', 'Item 3', 'type3'),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toHaveLength(2);

      const emptyGroup = result.find((g) => g.category === '');
      expect(emptyGroup?.items).toHaveLength(2);
      expect(emptyGroup?.items[0].title).toBe('Item 1');
      expect(emptyGroup?.items[1].title).toBe('Item 3');

      const normalGroup = result.find((g) => g.category === 'Normal Category');
      expect(normalGroup?.items).toHaveLength(1);
      expect(normalGroup?.items[0].title).toBe('Item 2');
    });

    it('should return categories in the order they first appear', () => {
      const items = [
        createMockSearchItem('1', 'Category C', 'Item 1', 'type1'),
        createMockSearchItem('2', 'Category A', 'Item 2', 'type2'),
        createMockSearchItem('3', 'Category B', 'Item 3', 'type3'),
        createMockSearchItem('4', 'Category A', 'Item 4', 'type2'),
      ];

      const result = groupResultsByCategory(items);

      expect(result).toHaveLength(3);
      const categoryOrder = result.map((group) => group.category);
      expect(categoryOrder).toEqual(['Category C', 'Category A', 'Category B']);
      const categoryAGroup = result.find((g) => g.category === 'Category A');
      expect(categoryAGroup?.items).toHaveLength(2);
    });

    it('should handle typical search result size with all feature store categories', () => {
      const items: ISearchItem[] = [];
      const categoryTypes = [
        { category: FEATURE_STORE_TYPE_TO_CATEGORY.entity, type: 'entity' },
        { category: FEATURE_STORE_TYPE_TO_CATEGORY.dataSource, type: 'dataSource' },
        { category: FEATURE_STORE_TYPE_TO_CATEGORY.featureView, type: 'featureView' },
        { category: FEATURE_STORE_TYPE_TO_CATEGORY.feature, type: 'feature' },
        { category: FEATURE_STORE_TYPE_TO_CATEGORY.featureService, type: 'featureService' },
      ];

      // Create 25 items (5 per category) - realistic search result size
      for (let i = 0; i < 25; i++) {
        const categoryType = categoryTypes[i % 5];
        items.push(
          createMockSearchItem(
            i.toString(),
            categoryType.category,
            `${categoryType.type}_${Math.floor(i / 5) + 1}`,
            categoryType.type,
          ),
        );
      }

      const result = groupResultsByCategory(items);

      // Should have all 5 Feature Store categories
      expect(result).toHaveLength(5);

      // Verify each category has the expected number of items
      result.forEach((group) => {
        expect(group.items).toHaveLength(5);
        expect(Object.values(FEATURE_STORE_TYPE_TO_CATEGORY)).toContain(group.category);
      });
    });

    it('should group realistic API response data correctly (matching component usage)', () => {
      const items = createRealisticMockData();

      const result = groupResultsByCategory(items);
      expect(result).toHaveLength(5);
      result.forEach((group) => {
        expect(group).toHaveProperty('category');
        expect(group).toHaveProperty('items');
        expect(Array.isArray(group.items)).toBe(true);
        expect(group.items.length).toBeGreaterThan(0);

        group.items.forEach((item) => {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('title');
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('project');
          expect(item).toHaveProperty('category', group.category);
        });
      });

      expect(result[0].category).toBe(FEATURE_STORE_TYPE_TO_CATEGORY.dataSource);
      expect(result[1].category).toBe(FEATURE_STORE_TYPE_TO_CATEGORY.featureView);
      expect(result[2].category).toBe(FEATURE_STORE_TYPE_TO_CATEGORY.feature);
      expect(result[3].category).toBe(FEATURE_STORE_TYPE_TO_CATEGORY.featureService);
      expect(result[4].category).toBe(FEATURE_STORE_TYPE_TO_CATEGORY.entity);

      for (let groupIndex = 0; groupIndex < result.length; groupIndex++) {
        const shouldShowDivider = groupIndex < result.length - 1;
        if (shouldShowDivider) {
          expect(groupIndex).toBeLessThan(4);
        } else {
          expect(groupIndex).toBe(4);
        }
      }
    });

    it('should handle component rendering pattern with mixed projects', () => {
      const items = createRealisticMockData();

      const result = groupResultsByCategory(items);

      const renderableGroups = result.map((group, groupIndex, groups) => ({
        group,
        groupIndex,
        isLast: groupIndex === groups.length - 1,
        shouldShowDivider: groupIndex < groups.length - 1,
      }));

      expect(renderableGroups).toHaveLength(5);
      expect(renderableGroups[0].shouldShowDivider).toBe(true);
      expect(renderableGroups[1].shouldShowDivider).toBe(true);
      expect(renderableGroups[2].shouldShowDivider).toBe(true);
      expect(renderableGroups[3].shouldShowDivider).toBe(true);
      expect(renderableGroups[4].shouldShowDivider).toBe(false);
      expect(renderableGroups[4].isLast).toBe(true);

      renderableGroups.forEach(({ group }) => {
        expect(group.category).toBeTruthy();
        expect(group.items.length).toBeGreaterThan(0);

        group.items.forEach((item) => {
          expect(item.id).toBeDefined();
          expect(item.title).toBeDefined();
          expect(item.description).toBeDefined();
        });
      });

      const allProjects = result.flatMap((group) => group.items.map((item) => item.project));
      expect(allProjects).toContain(TEST_PROJECTS.SECONDARY);
      expect(allProjects).toContain(TEST_PROJECTS.PRIMARY);
    });
  });
});
