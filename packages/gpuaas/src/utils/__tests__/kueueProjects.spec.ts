import { KnownLabels } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  getKueueManagedDataScienceProjects,
  getNonKueueManagedDataScienceProjects,
  isKueueManagedDataScienceProject,
  isNonKueueManagedDataScienceProject,
} from '../kueueProjects';

describe('kueueProjects', () => {
  const kueueManagedProject = mockProjectK8sResource({
    k8sName: 'kueue-project',
    enableKueue: true,
  });
  const nonKueueDsProject = mockProjectK8sResource({
    k8sName: 'legacy-batch',
    enableKueue: false,
  });
  const nonDsProject = mockProjectK8sResource({
    k8sName: 'system-project',
    isDSProject: false,
    enableKueue: false,
  });

  describe('isNonKueueManagedDataScienceProject', () => {
    it('should return true for data science projects without the Kueue managed label', () => {
      expect(isNonKueueManagedDataScienceProject(nonKueueDsProject)).toBe(true);
    });

    it('should return false for Kueue-managed data science projects', () => {
      expect(isNonKueueManagedDataScienceProject(kueueManagedProject)).toBe(false);
    });

    it('should return false for projects without the dashboard label', () => {
      expect(isNonKueueManagedDataScienceProject(nonDsProject)).toBe(false);
    });

    it('should return false when the Kueue managed label is not true', () => {
      const project = mockProjectK8sResource({ k8sName: 'false-label-project' });
      project.metadata.labels = {
        ...project.metadata.labels,
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        [KnownLabels.KUEUE_MANAGED]: 'false',
      };

      expect(isNonKueueManagedDataScienceProject(project)).toBe(true);
    });
  });

  describe('isKueueManagedDataScienceProject', () => {
    it('should return true for Kueue-managed data science projects', () => {
      expect(isKueueManagedDataScienceProject(kueueManagedProject)).toBe(true);
    });

    it('should return false for non-Kueue-managed data science projects', () => {
      expect(isKueueManagedDataScienceProject(nonKueueDsProject)).toBe(false);
    });
  });

  describe('getKueueManagedDataScienceProjects', () => {
    it('should return only Kueue-managed data science projects', () => {
      expect(
        getKueueManagedDataScienceProjects([
          kueueManagedProject,
          nonKueueDsProject,
          nonDsProject,
        ]).map((project) => project.metadata.name),
      ).toEqual(['kueue-project']);
    });
  });

  describe('getNonKueueManagedDataScienceProjects', () => {
    it('should return only non-Kueue-managed data science projects', () => {
      expect(
        getNonKueueManagedDataScienceProjects([
          kueueManagedProject,
          nonKueueDsProject,
          nonDsProject,
        ]).map((project) => project.metadata.name),
      ).toEqual(['legacy-batch']);
    });
  });
});
