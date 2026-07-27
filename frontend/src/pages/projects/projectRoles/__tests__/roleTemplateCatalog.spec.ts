import {
  ROLE_TEMPLATE_CATALOG,
  type RoleTemplate,
  type RoleTemplateCategory,
} from '#~/pages/projects/projectRoles/roleTemplateCatalog';

describe('roleTemplateCatalog', () => {
  it('should have at least one category', () => {
    expect(ROLE_TEMPLATE_CATALOG.length).toBeGreaterThan(0);
  });

  it('should have unique category IDs', () => {
    const ids = ROLE_TEMPLATE_CATALOG.map((c: RoleTemplateCategory) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have unique template IDs across all categories', () => {
    const ids = ROLE_TEMPLATE_CATALOG.flatMap((c: RoleTemplateCategory) =>
      c.templates.map((t: RoleTemplate) => t.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have non-empty rules for every template', () => {
    for (const category of ROLE_TEMPLATE_CATALOG) {
      for (const template of category.templates) {
        expect(template.rules.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have workbench management category with three templates', () => {
    const workbench = ROLE_TEMPLATE_CATALOG.find((c) => c.id === 'workbench-management');
    expect(workbench).toBeDefined();
    expect(workbench?.templates).toHaveLength(3);
  });

  it('should have valid rule structure for all templates', () => {
    for (const category of ROLE_TEMPLATE_CATALOG) {
      for (const template of category.templates) {
        for (const rule of template.rules) {
          expect(rule.verbs.length).toBeGreaterThan(0);
          expect(rule.apiGroups).toBeDefined();
          expect(rule.resources).toBeDefined();
        }
      }
    }
  });

  it('should not use wildcard verbs in any template', () => {
    for (const category of ROLE_TEMPLATE_CATALOG) {
      for (const template of category.templates) {
        for (const rule of template.rules) {
          expect(rule.verbs).not.toContain('*');
        }
      }
    }
  });

  it('should not grant create or delete on notebooks in updater template', () => {
    const updater = ROLE_TEMPLATE_CATALOG.flatMap((c) => c.templates).find(
      (t) => t.id === 'workbench-updater',
    );
    expect(updater).toBeDefined();
    if (!updater) {
      return;
    }
    const notebookRules = updater.rules.filter(
      (r) => r.resources?.includes('notebooks') || r.resources?.includes('*'),
    );
    for (const rule of notebookRules) {
      expect(rule.verbs).not.toContain('*');
      expect(rule.verbs).not.toContain('create');
      expect(rule.verbs).not.toContain('delete');
    }
  });
});
