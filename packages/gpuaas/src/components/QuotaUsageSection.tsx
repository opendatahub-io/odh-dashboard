import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import QuotaUsageDetailPanel from './quotaUsage/QuotaUsageDetailPanel';
import QuotaUsageNavPanel from './quotaUsage/QuotaUsageNavPanel';
import KueueNamespaceWorkloadCacheProvider, {
  useKueueNamespaceWorkloadCache,
} from '../hooks/KueueNamespaceWorkloadCacheContext';
import './QuotaUsageSection.scss';
import {
  QUOTA_USAGE_EMPTY_BODY,
  QUOTA_USAGE_EMPTY_TITLE,
  QUOTA_USAGE_ERROR_TITLE,
  QUOTA_USAGE_TREE_DRAWER_PANEL_ID,
} from '../const';
import useQuotaUsageDetail from '../hooks/useQuotaUsageDetail';
import { QuotaSelection, QuotaTreeNode } from '../types';
import { syncQuotaSelectionWithTree } from '../utils/quotaUsageTreeUtils';

const drawerNavBodyStyle: React.CSSProperties = {
  minWidth: 0,
  paddingRight: 'var(--pf-t--global--spacer--lg)',
};

const quotaUsageLoadingStyle: React.CSSProperties = {
  paddingBlockStart: 'var(--pf-t--global--spacer--3xl)',
  paddingBlockEnd: 'var(--pf-t--global--spacer--3xl)',
};

type QuotaUsageSectionProps = {
  tree: QuotaTreeNode[];
  loaded: boolean;
  error?: Error;
  onRegisterWorkloadRefresh?: (refresh: (() => Promise<unknown>) | undefined) => void;
  onRegisterDetailRefresh?: (refresh: () => Promise<unknown[]>) => void;
};

/** Registers workload-cache manual refresh with the Quota usage section refresh badge. */
const QuotaUsageWorkloadRefreshBridge: React.FC<{
  onRegister?: QuotaUsageSectionProps['onRegisterWorkloadRefresh'];
}> = ({ onRegister }) => {
  const { refresh } = useKueueNamespaceWorkloadCache();

  React.useEffect(() => {
    onRegister?.(refresh);
    return () => onRegister?.(undefined);
  }, [onRegister, refresh]);

  return null;
};

const QuotaUsageSection: React.FC<QuotaUsageSectionProps> = ({
  tree,
  loaded,
  error,
  onRegisterWorkloadRefresh,
  onRegisterDetailRefresh,
}) => {
  const [userSelection, setUserSelection] = React.useState<QuotaSelection | undefined>();

  const selection = React.useMemo(() => {
    if (!loaded || tree.length === 0) {
      return undefined;
    }
    return syncQuotaSelectionWithTree(tree, userSelection);
  }, [loaded, tree, userSelection]);

  React.useEffect(() => {
    if (!loaded || tree.length === 0) {
      setUserSelection(undefined);
    }
  }, [loaded, tree.length]);

  const {
    loaded: detailLoaded,
    error: detailError,
    detail,
    refreshDetailData,
  } = useQuotaUsageDetail(tree, selection);

  React.useEffect(() => {
    onRegisterDetailRefresh?.(refreshDetailData);
    return () => onRegisterDetailRefresh?.(() => Promise.resolve([]));
  }, [onRegisterDetailRefresh, refreshDetailData]);

  if (error) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText={QUOTA_USAGE_ERROR_TITLE}
        variant={EmptyStateVariant.sm}
        data-testid="quota-usage-error"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <Flex
        style={quotaUsageLoadingStyle}
        justifyContent={{ default: 'justifyContentCenter' }}
        data-testid="quota-usage-loading"
      >
        <EmptyState
          headingLevel="h4"
          icon={Spinner}
          titleText="Loading"
          variant={EmptyStateVariant.sm}
        />
      </Flex>
    );
  }

  if (tree.length === 0) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={CubesIcon}
        titleText={QUOTA_USAGE_EMPTY_TITLE}
        variant={EmptyStateVariant.sm}
        data-testid="quota-usage-empty"
      >
        <EmptyStateBody>{QUOTA_USAGE_EMPTY_BODY}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <KueueNamespaceWorkloadCacheProvider
      clusterQueueNames={selection?.type === 'clusterQueue' ? [selection.clusterQueueName] : []}
    >
      <QuotaUsageWorkloadRefreshBridge onRegister={onRegisterWorkloadRefresh} />
      <Flex
        direction={{ default: 'column' }}
        grow={{ default: 'grow' }}
        className="gpuaas-quota-usage-section"
        data-testid="quota-usage-section"
      >
        <Drawer isExpanded isInline>
          <DrawerContent
            panelContent={
              <DrawerPanelContent
                id={QUOTA_USAGE_TREE_DRAWER_PANEL_ID}
                isResizable
                defaultSize="75%"
                minSize="60%"
                maxSize="85%"
                data-testid="quota-usage-detail-drawer"
              >
                <QuotaUsageDetailPanel
                  tree={tree}
                  selection={selection}
                  onSelectionChange={setUserSelection}
                  detail={detail}
                  detailLoaded={detailLoaded}
                  error={detailError}
                />
              </DrawerPanelContent>
            }
          >
            <DrawerContentBody style={drawerNavBodyStyle}>
              <QuotaUsageNavPanel
                tree={tree}
                selection={selection}
                onSelectionChange={setUserSelection}
              />
            </DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </Flex>
    </KueueNamespaceWorkloadCacheProvider>
  );
};

export default QuotaUsageSection;
