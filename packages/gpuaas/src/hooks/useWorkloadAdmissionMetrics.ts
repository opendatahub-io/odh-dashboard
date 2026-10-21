import * as React from 'react';
import usePrometheusQueryRange from '@odh-dashboard/internal/api/prometheus/usePrometheusQueryRange';
import { listLocalQueues } from '@odh-dashboard/k8s-core/api/localQueues';
import type { LocalQueueKind } from '@odh-dashboard/k8s-core';
import type { AdmissionMetricSeries } from '../utils/admissionMetrics';
import {
  admissionMetricResponsePredicate,
  buildActiveWorkloadsQuery,
  buildAdmissionLeadTimeQuery,
  buildAdmissionRateQuery,
  buildWaitingWorkloadsQuery,
  mapAdmissionLeadTimeSeries,
  mapAdmissionMetricSeries,
} from '../utils/admissionMetrics';
import { PROMETHEUS_CLUSTER_QUERY_RANGE_PATH, TREND_REFRESH_INTERVAL } from '../const';

export type WorkloadAdmissionMetrics = {
  admissionRate: AdmissionMetricSeries;
  admissionLeadTime: AdmissionMetricSeries;
  waitingWorkloads: AdmissionMetricSeries;
  activeWorkloads: AdmissionMetricSeries;
  loading: boolean;
  loaded: boolean;
  error?: Error;
};

export const getWindowConfig = (
  timeWindow: string,
): { span: number; step: number; rateWindow: string } => {
  switch (timeWindow) {
    case '1h':
      return { span: 60 * 60, step: 60, rateWindow: '5m' };
    case '7d':
      return { span: 7 * 24 * 60 * 60, step: 60 * 60, rateWindow: '2h' };
    case '30d':
      return { span: 30 * 24 * 60 * 60, step: 4 * 60 * 60, rateWindow: '8h' };
    case '24h':
    default:
      return { span: 24 * 60 * 60, step: 5 * 60, rateWindow: '15m' };
  }
};

const useWorkloadAdmissionMetrics = (
  namespace: string | undefined,
  timeWindow: string,
  enabled: boolean,
  canAccessAdminMetrics: boolean,
  refreshTrigger: number,
): WorkloadAdmissionMetrics => {
  const [endInMs, setEndInMs] = React.useState(() => Date.now());
  const { span, step, rateWindow } = getWindowConfig(timeWindow);
  const active = enabled && Boolean(namespace);
  const adminActive = active && canAccessAdminMetrics;
  const previousRequest = React.useRef({ active, namespace, timeWindow });
  const requestChanged =
    previousRequest.current.active !== active ||
    previousRequest.current.namespace !== namespace ||
    previousRequest.current.timeWindow !== timeWindow;
  const [localQueues, setLocalQueues] = React.useState<LocalQueueKind[]>([]);
  const [localQueuesLoaded, setLocalQueuesLoaded] = React.useState(false);
  const [localQueueError, setLocalQueueError] = React.useState<Error | undefined>();
  const fetchOptions = React.useMemo(() => ({ refreshRate: TREND_REFRESH_INTERVAL }), []);

  React.useEffect(() => {
    previousRequest.current = { active, namespace, timeWindow };
  }, [active, namespace, timeWindow]);

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      setEndInMs(Date.now());
    }
  }, [refreshTrigger]);

  React.useEffect(() => {
    if (!active) {
      return undefined;
    }
    const interval = window.setInterval(() => setEndInMs(Date.now()), TREND_REFRESH_INTERVAL);
    return () => window.clearInterval(interval);
  }, [active]);

  React.useEffect(() => {
    let cancelled = false;
    setLocalQueuesLoaded(false);
    setLocalQueueError(undefined);
    if (!active || !namespace) {
      setLocalQueues([]);
      setLocalQueuesLoaded(true);
      return undefined;
    }
    void listLocalQueues(namespace)
      .then((queues) => {
        if (!cancelled) {
          setLocalQueues(queues);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLocalQueues([]);
          setLocalQueueError(error instanceof Error ? error : new Error(String(error)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLocalQueuesLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, namespace]);

  const localQueueNames = localQueues.map((queue) => queue.metadata?.name ?? '').filter(Boolean);
  const clusterQueueNames = localQueues.map((queue) => queue.spec.clusterQueue).filter(Boolean);
  const queriesActive = active && localQueuesLoaded && localQueueNames.length > 0;
  const adminQueriesActive = adminActive && localQueuesLoaded && clusterQueueNames.length > 0;

  const admissionRate = usePrometheusQueryRange(
    adminQueriesActive,
    PROMETHEUS_CLUSTER_QUERY_RANGE_PATH,
    buildAdmissionRateQuery(clusterQueueNames, rateWindow),
    span,
    endInMs,
    step,
    admissionMetricResponsePredicate,
    '',
    fetchOptions,
  );
  const admissionLeadTime = usePrometheusQueryRange(
    adminQueriesActive,
    PROMETHEUS_CLUSTER_QUERY_RANGE_PATH,
    buildAdmissionLeadTimeQuery(clusterQueueNames, rateWindow),
    span,
    endInMs,
    step,
    admissionMetricResponsePredicate,
    '',
    fetchOptions,
  );
  const waitingWorkloads = usePrometheusQueryRange(
    queriesActive,
    PROMETHEUS_CLUSTER_QUERY_RANGE_PATH,
    buildWaitingWorkloadsQuery(localQueueNames),
    span,
    endInMs,
    step,
    admissionMetricResponsePredicate,
    '',
    fetchOptions,
  );
  const activeWorkloads = usePrometheusQueryRange(
    queriesActive,
    PROMETHEUS_CLUSTER_QUERY_RANGE_PATH,
    buildActiveWorkloadsQuery(localQueueNames),
    span,
    endInMs,
    step,
    admissionMetricResponsePredicate,
    '',
    fetchOptions,
  );
  const activeQueryStates = [
    ...(queriesActive ? [waitingWorkloads, activeWorkloads] : []),
    ...(adminQueriesActive ? [admissionRate, admissionLeadTime] : []),
  ];
  const activeQueriesSettled = activeQueryStates.every(([, loaded, error]) => loaded || error);

  return {
    admissionRate: mapAdmissionMetricSeries(admissionRate[0]),
    admissionLeadTime: mapAdmissionLeadTimeSeries(admissionLeadTime[0]),
    waitingWorkloads: mapAdmissionMetricSeries(waitingWorkloads[0], Math.round),
    activeWorkloads: mapAdmissionMetricSeries(activeWorkloads[0], Math.round),
    loading: active && (requestChanged || !localQueuesLoaded || !activeQueriesSettled),
    loaded: !active || (localQueuesLoaded && activeQueriesSettled),
    error:
      localQueueError ||
      admissionRate[2] ||
      admissionLeadTime[2] ||
      waitingWorkloads[2] ||
      activeWorkloads[2],
  };
};

export default useWorkloadAdmissionMetrics;
