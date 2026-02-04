import {
  PREFERRED_PROJECT_STORAGE_KEY,
  getPreferredProject,
  setPreferredProject,
  clearPreferredProject,
} from '#~/concepts/projects/preferredProjectStorage';

describe('preferredProjectStorage', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  describe('getPreferredProject', () => {
    it('should return null when no preferred project is set', () => {
      expect(getPreferredProject()).toBeNull();
    });

    it('should return the preferred project name when set', () => {
      sessionStorage.setItem(PREFERRED_PROJECT_STORAGE_KEY, 'my-project');
      expect(getPreferredProject()).toBe('my-project');
    });

    it('should return the most recently set project', () => {
      sessionStorage.setItem(PREFERRED_PROJECT_STORAGE_KEY, 'project-1');
      expect(getPreferredProject()).toBe('project-1');

      sessionStorage.setItem(PREFERRED_PROJECT_STORAGE_KEY, 'project-2');
      expect(getPreferredProject()).toBe('project-2');
    });
  });

  describe('setPreferredProject', () => {
    it('should store the project name in sessionStorage', () => {
      setPreferredProject('my-project');
      expect(sessionStorage.getItem(PREFERRED_PROJECT_STORAGE_KEY)).toBe('my-project');
    });

    it('should overwrite existing project name', () => {
      setPreferredProject('project-1');
      expect(sessionStorage.getItem(PREFERRED_PROJECT_STORAGE_KEY)).toBe('project-1');

      setPreferredProject('project-2');
      expect(sessionStorage.getItem(PREFERRED_PROJECT_STORAGE_KEY)).toBe('project-2');
    });

    it('should handle project names with special characters', () => {
      const projectName = 'my-project-123_test';
      setPreferredProject(projectName);
      expect(sessionStorage.getItem(PREFERRED_PROJECT_STORAGE_KEY)).toBe(projectName);
    });
  });

  describe('clearPreferredProject', () => {
    it('should remove the preferred project from sessionStorage', () => {
      sessionStorage.setItem(PREFERRED_PROJECT_STORAGE_KEY, 'my-project');
      expect(sessionStorage.getItem(PREFERRED_PROJECT_STORAGE_KEY)).toBe('my-project');

      clearPreferredProject();
      expect(sessionStorage.getItem(PREFERRED_PROJECT_STORAGE_KEY)).toBeNull();
    });

    it('should not throw when clearing non-existent project', () => {
      expect(() => clearPreferredProject()).not.toThrow();
    });

    it('should clear the project and getPreferredProject should return null', () => {
      setPreferredProject('my-project');
      expect(getPreferredProject()).toBe('my-project');

      clearPreferredProject();
      expect(getPreferredProject()).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete set-get-clear workflow', () => {
      // Initially no project
      expect(getPreferredProject()).toBeNull();

      // Set a project
      setPreferredProject('data-science-project');
      expect(getPreferredProject()).toBe('data-science-project');

      // Change the project
      setPreferredProject('ml-project');
      expect(getPreferredProject()).toBe('ml-project');

      // Clear the project
      clearPreferredProject();
      expect(getPreferredProject()).toBeNull();
    });
  });
});
