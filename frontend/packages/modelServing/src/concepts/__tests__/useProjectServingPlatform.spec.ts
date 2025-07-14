import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockModelServingPlatform, mockProjectWithPlatform } from '../../__tests__/mockUtils';
import { useProjectServingPlatform } from '../useProjectServingPlatform';

describe('useProjectServingPlatform', () => {
  describe('loading', () => {
    it('return undefined if project not loaded', () => {
      const emptyProject = mockProjectK8sResource({ k8sName: '' });
      const { result } = renderHook(() => useProjectServingPlatform(emptyProject));
      expect(result.current.projectPlatform).toBeUndefined();
      expect(result.current.activePlatform).toBeUndefined();
    });

    it('return null if no platforms', () => {
      const project = mockProjectK8sResource({});
      const { result } = renderHook(() => useProjectServingPlatform(project, []));
      expect(result.current.projectPlatform).toBeNull();
      expect(result.current.activePlatform).toBeNull();
    });
  });

  describe('loaded', () => {
    it('return active platform only 1 available', () => {
      const project = mockProjectK8sResource({});
      const platform = mockModelServingPlatform({});
      const { result } = renderHook(() => useProjectServingPlatform(project, [platform]));
      expect(result.current.projectPlatform).toBeNull();
      expect(result.current.activePlatform).toEqual(platform);
    });

    it('return no platform if 2 platforms available', () => {
      const project = mockProjectK8sResource({});
      const platform1 = mockModelServingPlatform({ id: 'kserve-1' });
      const platform2 = mockModelServingPlatform({ id: 'kserve-2' });
      const { result } = renderHook(() =>
        useProjectServingPlatform(project, [platform1, platform2]),
      );
      expect(result.current.projectPlatform).toBeNull();
      expect(result.current.activePlatform).toBeNull();
    });

    it('return project platform if set', () => {
      const platform1 = mockModelServingPlatform({ id: 'kserve-1' });
      const platform2 = mockModelServingPlatform({ id: 'kserve-2' });
      const project = mockProjectWithPlatform(mockProjectK8sResource({}), platform1);
      const { result } = renderHook(() =>
        useProjectServingPlatform(project, [platform1, platform2]),
      );
      expect(result.current.projectPlatform).toEqual(platform1);
      expect(result.current.activePlatform).toEqual(platform1);
    });
  });
});
