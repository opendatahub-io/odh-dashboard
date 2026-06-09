import {
  VERB_CATEGORIES,
  ALL_VERBS_WILDCARD,
  ALL_INDIVIDUAL_VERBS,
} from '#~/pages/projects/projectRoles/verbCategories';

describe('verbCategories', () => {
  it('should have four verb categories', () => {
    expect(VERB_CATEGORIES).toHaveLength(4);
  });

  it('should have create, read, update, delete categories', () => {
    const ids = VERB_CATEGORIES.map((c) => c.id);
    expect(ids).toEqual(['cat-create', 'cat-read', 'cat-update', 'cat-delete']);
  });

  it('should have create verb in create category', () => {
    const createCategory = VERB_CATEGORIES.find((c) => c.id === 'cat-create');
    expect(createCategory?.verbs.map((v) => v.verb)).toEqual(['create']);
  });

  it('should have get, list, watch in read category', () => {
    const readCategory = VERB_CATEGORIES.find((c) => c.id === 'cat-read');
    expect(readCategory?.verbs.map((v) => v.verb)).toEqual(['get', 'list', 'watch']);
  });

  it('should have update, patch in update category', () => {
    const updateCategory = VERB_CATEGORIES.find((c) => c.id === 'cat-update');
    expect(updateCategory?.verbs.map((v) => v.verb)).toEqual(['update', 'patch']);
  });

  it('should have delete, deletecollection in delete category', () => {
    const deleteCategory = VERB_CATEGORIES.find((c) => c.id === 'cat-delete');
    expect(deleteCategory?.verbs.map((v) => v.verb)).toEqual(['delete', 'deletecollection']);
  });

  it('should set ALL_VERBS_WILDCARD to "*"', () => {
    expect(ALL_VERBS_WILDCARD).toBe('*');
  });

  it('should include all individual verbs from all categories', () => {
    expect(ALL_INDIVIDUAL_VERBS).toEqual([
      'create',
      'get',
      'list',
      'watch',
      'update',
      'patch',
      'delete',
      'deletecollection',
    ]);
  });

  it('should have unique verb names across all categories', () => {
    const allVerbs = VERB_CATEGORIES.flatMap((c) => c.verbs.map((v) => v.verb));
    const uniqueVerbs = new Set(allVerbs);
    expect(allVerbs.length).toBe(uniqueVerbs.size);
  });
});
