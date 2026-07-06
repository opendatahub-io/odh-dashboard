import { renderHook } from '@testing-library/react';
import { EventKind } from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { EventModel } from '@odh-dashboard/internal/api/models/k8s';
import { useWatchTrainJobEvents } from '../events';
import { mockEventK8sResource } from '../../__mocks__/mockEventK8sResource';

jest.mock('@odh-dashboard/internal/utilities/useK8sWatchResourceList');

const mockUseK8sWatchResourceList = jest.mocked(useK8sWatchResourceList);

describe('Events API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useWatchTrainJobEvents', () => {
    const mockTrainJobEvent = mockEventK8sResource({
      name: 'test-job.event1',
      namespace: 'test-namespace',
      involvedObjectName: 'test-job',
      involvedObjectKind: 'TrainJob',
    });

    const mockJobSetEvent = mockEventK8sResource({
      name: 'test-job.event2',
      namespace: 'test-namespace',
      involvedObjectName: 'test-job',
      involvedObjectKind: 'JobSet',
    });

    const mockWorkloadEvent = mockEventK8sResource({
      name: 'test-workload.event1',
      namespace: 'test-namespace',
      involvedObjectName: 'test-workload',
      involvedObjectKind: 'Workload',
    });

    it('should watch TrainJob events', () => {
      mockUseK8sWatchResourceList.mockReturnValue([[mockTrainJobEvent], true, undefined] as [
        EventKind[],
        boolean,
        undefined,
      ]);

      const { result } = renderHook(() => useWatchTrainJobEvents('test-namespace', 'test-job'));

      expect(mockUseK8sWatchResourceList).toHaveBeenCalledWith(
        expect.objectContaining({
          isList: true,
          namespace: 'test-namespace',
          fieldSelector: 'involvedObject.name=test-job',
        }),
        EventModel,
      );

      const [events, loaded] = result.current;
      expect(events).toHaveLength(1);
      expect(loaded).toBe(true);
    });

    it('should watch JobSet events', () => {
      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[mockTrainJobEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[mockJobSetEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ]);

      const { result } = renderHook(() => useWatchTrainJobEvents('test-namespace', 'test-job'));

      expect(mockUseK8sWatchResourceList).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldSelector: 'involvedObject.kind=JobSet,involvedObject.name=test-job',
        }),
        EventModel,
      );

      const [events] = result.current;
      expect(events).toHaveLength(2);
    });

    it('should watch Workload events when workloadName provided', () => {
      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[mockTrainJobEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ])
        .mockReturnValueOnce([[mockWorkloadEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ])
        .mockReturnValueOnce([[mockJobSetEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ]);

      const { result } = renderHook(() =>
        useWatchTrainJobEvents('test-namespace', 'test-job', 'test-workload'),
      );

      expect(mockUseK8sWatchResourceList).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldSelector: 'involvedObject.kind=Workload,involvedObject.name=test-workload',
        }),
        EventModel,
      );

      const [events] = result.current;
      expect(events).toHaveLength(3);
    });

    it('should not watch Workload events when workloadName not provided', () => {
      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[mockTrainJobEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[mockJobSetEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ]);

      renderHook(() => useWatchTrainJobEvents('test-namespace', 'test-job'));

      expect(mockUseK8sWatchResourceList).toHaveBeenNthCalledWith(2, null, EventModel);
    });

    it('should deduplicate events by UID', () => {
      const duplicateEvent = { ...mockTrainJobEvent };

      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[mockTrainJobEvent, duplicateEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined]);

      const { result } = renderHook(() => useWatchTrainJobEvents('test-namespace', 'test-job'));

      const [events] = result.current;
      expect(events).toHaveLength(1);
    });

    it('should merge events from all sources', () => {
      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[mockTrainJobEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ])
        .mockReturnValueOnce([[mockWorkloadEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ])
        .mockReturnValueOnce([[mockJobSetEvent], true, undefined] as [
          EventKind[],
          boolean,
          undefined,
        ]);

      const { result } = renderHook(() =>
        useWatchTrainJobEvents('test-namespace', 'test-job', 'test-workload'),
      );

      const [events] = result.current;
      expect(events).toHaveLength(3);
      expect(events).toContainEqual(mockTrainJobEvent);
      expect(events).toContainEqual(mockWorkloadEvent);
      expect(events).toContainEqual(mockJobSetEvent);
    });

    it('should handle loading state correctly', () => {
      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[], false, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined]);

      const { result } = renderHook(() => useWatchTrainJobEvents('test-namespace', 'test-job'));

      const [, loaded] = result.current;
      expect(loaded).toBe(false); // Should be false if any source is loading
    });

    it('should handle loading state with workload', () => {
      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[], false, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined]);

      const { result } = renderHook(() =>
        useWatchTrainJobEvents('test-namespace', 'test-job', 'test-workload'),
      );

      const [, loaded] = result.current;
      expect(loaded).toBe(false); // Should be false if workload events are loading
    });

    it('should handle empty event arrays', () => {
      mockUseK8sWatchResourceList
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined])
        .mockReturnValueOnce([[], true, undefined] as [EventKind[], boolean, undefined]);

      const { result } = renderHook(() => useWatchTrainJobEvents('test-namespace', 'test-job'));

      const [events, loaded] = result.current;
      expect(events).toEqual([]);
      expect(loaded).toBe(true);
    });
  });
});
