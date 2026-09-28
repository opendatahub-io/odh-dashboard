import * as React from 'react';
import useResourceFlavors from '../hooks/useResourceFlavors';
import useCQDcgmMetrics from '../hooks/useCQDcgmMetrics';
import {
  buildQuotaUsageAcceleratorRows,
  buildQuotaUsageSummary,
  collectAcceleratorClusterQueuesFromSelection,
  collectBorrowingClusterQueuesFromNode,
  resolveBorrowSourceCohortName,
} from '../utils/quotaUsageAggregation';
import { findQuotaTreeNode, nodeIdFromSelection } from '../utils/quotaUsageTreeUtils';
import {
  QUOTA_NODE_TYPE,
  QuotaSelection,
  QuotaTreeNode,
  QuotaUsageAcceleratorRow,
  QuotaUsageSummary,
} from '../types';

export type QuotaUsageDetailData = {
  summary: QuotaUsageSummary;
  acceleratorRows: QuotaUsageAcceleratorRow[];
  showKueueProjectsLink: boolean;
  clusterQueueName?: string;
};

export type UseQuotaUsageDetailResult = {
  loaded: boolean;
  error?: Error;
  detail?: QuotaUsageDetailData;
  refreshDetailData: () => Promise<unknown[]>;
};

const useQuotaUsageDetail = (
  tree: QuotaTreeNode[],
  selection?: QuotaSelection,
): UseQuotaUsageDetailResult => {
  const {
    data: resourceFlavors,
    loaded: resourceFlavorsLoaded,
    error: resourceFlavorsError,
    refresh: refreshResourceFlavors,
  } = useResourceFlavors();
  const {
    byModel,
    loaded: dcgmLoaded,
    dcgmAvailable,
    error: dcgmError,
    refresh: refreshDcgmMetrics,
  } = useCQDcgmMetrics();

  const loaded = resourceFlavorsLoaded && dcgmLoaded;
  const error = resourceFlavorsError ?? dcgmError;

  const refreshDetailData = React.useCallback(
    () => Promise.all([refreshResourceFlavors(), refreshDcgmMetrics()]),
    [refreshDcgmMetrics, refreshResourceFlavors],
  );

  const detail = React.useMemo((): QuotaUsageDetailData | undefined => {
    if (!selection || !loaded) {
      return undefined;
    }

    const clusterQueues = collectAcceleratorClusterQueuesFromSelection(tree, selection);
    if (clusterQueues.length === 0) {
      return undefined;
    }

    const borrowSourceCohortName = resolveBorrowSourceCohortName(selection);
    const node = findQuotaTreeNode(tree, nodeIdFromSelection(selection));
    const baseSummary = buildQuotaUsageSummary(
      clusterQueues,
      resourceFlavors,
      dcgmAvailable ? byModel : undefined,
      dcgmAvailable,
      borrowSourceCohortName,
    );
    const summary = {
      ...baseSummary,
      borrowingClusterQueues:
        selection.type === QUOTA_NODE_TYPE.cohort && node
          ? collectBorrowingClusterQueuesFromNode(tree, node)
          : [],
    };
    const acceleratorRows = buildQuotaUsageAcceleratorRows(
      clusterQueues,
      resourceFlavors,
      dcgmAvailable ? byModel : undefined,
    );

    return {
      summary,
      acceleratorRows,
      showKueueProjectsLink: selection.type === QUOTA_NODE_TYPE.clusterQueue,
      clusterQueueName:
        selection.type === QUOTA_NODE_TYPE.clusterQueue ? selection.clusterQueueName : undefined,
    };
  }, [byModel, dcgmAvailable, loaded, resourceFlavors, selection, tree]);

  return { loaded, error, detail, refreshDetailData };
};

export default useQuotaUsageDetail;
