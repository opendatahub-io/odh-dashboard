import type { DataScienceClusterInitializationKindStatus } from '@odh-dashboard/internal/k8sTypes';
import { getMonitoringStackSignal } from '../monitoringStackStatus';

describe('getMonitoringStackSignal', () => {
  it('returns unknown when DSCI status is null', () => {
    expect(getMonitoringStackSignal(null)).toEqual({ kind: 'unknown' });
  });

  it('returns unknown when conditions array is empty', () => {
    const dsci: DataScienceClusterInitializationKindStatus = { conditions: [] };
    expect(getMonitoringStackSignal(dsci)).toEqual({ kind: 'unknown' });
  });

  it('returns unknown when no blocking conditions are present (older operator)', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'ReconcileComplete',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({ kind: 'unknown' });
  });

  it('returns ready when MonitoringReady is True', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          reason: 'Ready',
          message: 'Monitoring stack is available',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({ kind: 'ready' });
  });

  it('returns ready when both MonitoringReady and PersesAvailable are True', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          reason: 'Ready',
          message: 'Monitoring stack is available',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'PersesAvailable',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({ kind: 'ready' });
  });

  it('returns unavailable when MonitoringReady is False (monitoring not enabled)', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'False',
          reason: 'Removed',
          message: 'Monitoring is not enabled',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({
      kind: 'unavailable',
      headline: 'Monitoring is not available.',
      operatorMessage: 'Monitoring is not enabled',
      reason: 'Removed',
    });
  });

  it('returns unavailable when MonitoringReady is False (COO missing)', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'False',
          reason: 'MissingOperator',
          message: 'Cluster Observability Operator must be installed',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({
      kind: 'unavailable',
      headline: 'Monitoring is not available.',
      operatorMessage: 'Cluster Observability Operator must be installed',
      reason: 'MissingOperator',
    });
  });

  it('returns unavailable when MonitoringReady is Unknown (initializing)', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'Unknown',
          reason: 'NotReady',
          message: 'Monitoring stack is initializing',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({
      kind: 'unavailable',
      headline: 'Monitoring is not available.',
      operatorMessage: 'Monitoring stack is initializing',
      reason: 'NotReady',
    });
  });

  it('returns unavailable when MonitoringReady is True but PersesAvailable is False', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          reason: 'Ready',
          message: 'Monitoring stack is available',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'PersesAvailable',
          status: 'False',
          reason: 'PersesCRDNotFound',
          message: 'Perses CRD not found — install the Perses Operator',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({
      kind: 'unavailable',
      headline: 'Perses is not available — observability dashboards cannot load.',
      operatorMessage: 'Perses CRD not found — install the Perses Operator',
      reason: 'PersesCRDNotFound',
    });
  });

  it('reports MonitoringReady first when both it and PersesAvailable are failing', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'PersesAvailable',
          status: 'False',
          reason: 'PersesCRDNotFound',
          message: 'Perses CRD not found',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
        {
          type: 'MonitoringReady',
          status: 'False',
          reason: 'MissingOperator',
          message: 'COO not installed',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    const signal = getMonitoringStackSignal(dsci);
    expect(signal.kind).toBe('unavailable');
    if (signal.kind === 'unavailable') {
      expect(signal.headline).toBe('Monitoring is not available.');
      expect(signal.reason).toBe('MissingOperator');
    }
  });

  it('returns ready when only PersesAvailable is present and True', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'PersesAvailable',
          status: 'True',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({ kind: 'ready' });
  });

  it('returns ready even when optional conditions are False', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'True',
          reason: 'Ready',
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
          reason: 'TracesNotConfigured',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    expect(getMonitoringStackSignal(dsci)).toEqual({ kind: 'ready' });
  });

  it('returns unavailable with no operatorMessage when condition has no message', () => {
    const dsci: DataScienceClusterInitializationKindStatus = {
      conditions: [
        {
          type: 'MonitoringReady',
          status: 'False',
          lastTransitionTime: '2024-01-01T00:00:00Z',
        },
      ],
    };
    const signal = getMonitoringStackSignal(dsci);
    expect(signal.kind).toBe('unavailable');
    if (signal.kind === 'unavailable') {
      expect(signal.operatorMessage).toBeUndefined();
      expect(signal.reason).toBeUndefined();
    }
  });
});
