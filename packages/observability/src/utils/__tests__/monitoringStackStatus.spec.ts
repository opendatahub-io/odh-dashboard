import type { DataScienceClusterInitializationKindStatus } from '@odh-dashboard/k8s-core';
import { isMonitoringStackAvailable, getMonitoringStatus } from '../monitoringStackStatus';

describe('isMonitoringStackAvailable', () => {
  it('should return false when DSCI status is null', () => {
    expect(isMonitoringStackAvailable(null)).toBe(false);
  });

  it('should return false when conditions field is undefined', () => {
    const dsci = {} as DataScienceClusterInitializationKindStatus;
    expect(isMonitoringStackAvailable(dsci)).toBe(false);
  });

  it('should return false when conditions array is empty', () => {
    const dsci: DataScienceClusterInitializationKindStatus = { conditions: [] };
    expect(isMonitoringStackAvailable(dsci)).toBe(false);
  });

  it('should return true when no blocking conditions are present (older operator)', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'ReconcileComplete',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(true);
  });

  it('should return true when MonitoringReady is True', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(true);
  });

  it('should return true when both MonitoringReady and PersesAvailable are True', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'PersesAvailable',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(true);
  });

  it('should return false when MonitoringReady is False', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'False',
          reason: 'Removed',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(false);
  });

  it('should return false when MonitoringReady is Unknown', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'Unknown',
          reason: 'NotReady',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(false);
  });

  it('should return false when MonitoringReady is True but PersesAvailable is False', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'PersesAvailable',
          status: 'False',
          reason: 'PersesCRDNotFound',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(false);
  });

  it('should return false when both MonitoringReady and PersesAvailable are failing', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'PersesAvailable',
          status: 'False',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'MonitoringReady',
          status: 'False',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(false);
  });

  it('should return true when only PersesAvailable is present and True', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'PersesAvailable',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(true);
  });

  it('should ignore unrelated conditions', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'PersesAvailable',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'TempoAvailable',
          status: 'False',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(isMonitoringStackAvailable(dsci)).toBe(true);
  });
});

describe('getMonitoringStatus', () => {
  it('should return monitoring-not-ready when DSCI status is null', () => {
    expect(getMonitoringStatus(null)).toEqual({ available: false, reason: 'monitoring-not-ready' });
  });

  it('should return monitoring-not-ready when conditions is undefined', () => {
    const dsci = {} as DataScienceClusterInitializationKindStatus;
    expect(getMonitoringStatus(dsci)).toEqual({ available: false, reason: 'monitoring-not-ready' });
  });

  it('should return monitoring-not-ready when MonitoringReady is False', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'False',
          reason: 'MissingOperator',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStatus(dsci)).toEqual({
      available: false,
      reason: 'monitoring-not-ready',
    });
  });

  it('should return perses-not-available when MonitoringReady is True but PersesAvailable is False', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'PersesAvailable',
          status: 'False',
          reason: 'PersesCRDNotFound',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStatus(dsci)).toEqual({
      available: false,
      reason: 'perses-not-available',
    });
  });

  it('should return available when both conditions are True', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'PersesAvailable',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStatus(dsci)).toEqual({ available: true });
  });
});
