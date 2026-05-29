import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { isWorkbenchMigrated } from '#~/concepts/notebooks/utils';

describe('isWorkbenchMigrated', () => {
  it('should return true when the inject-auth annotation is true', () => {
    expect(isWorkbenchMigrated(mockNotebookK8sResource({}))).toBe(true);
  });

  it('should return false when the inject-auth annotation is missing', () => {
    expect(isWorkbenchMigrated(mockNotebookK8sResource({ injectAuth: null }))).toBe(false);
  });

  it('should return false when the inject-auth annotation is not true', () => {
    expect(isWorkbenchMigrated(mockNotebookK8sResource({ injectAuth: 'false' }))).toBe(false);
  });

  it('should return false when the notebook is undefined', () => {
    expect(isWorkbenchMigrated(undefined)).toBe(false);
  });
});
