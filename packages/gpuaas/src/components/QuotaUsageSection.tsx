import * as React from 'react';
import {
  Bullseye,
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
import './QuotaUsageSection.scss';
import {
  QUOTA_USAGE_EMPTY_BODY,
  QUOTA_USAGE_EMPTY_TITLE,
  QUOTA_USAGE_ERROR_TITLE,
  QUOTA_USAGE_TREE_DRAWER_PANEL_ID,
} from '../const';
import { QuotaSelection, QuotaTreeNode } from '../types';
import { syncQuotaSelectionWithTree } from '../utils/quotaUsageTreeUtils';

const drawerNavBodyStyle: React.CSSProperties = {
  minWidth: 0,
  paddingRight: 'var(--pf-t--global--spacer--lg)',
};

type QuotaUsageSectionProps = {
  tree: QuotaTreeNode[];
  loaded: boolean;
  error?: Error;
};

const QuotaUsageSection: React.FC<QuotaUsageSectionProps> = ({ tree, loaded, error }) => {
  const [selection, setSelection] = React.useState<QuotaSelection | undefined>();

  React.useEffect(() => {
    if (!loaded || tree.length === 0) {
      setSelection(undefined);
      return;
    }
    setSelection((current) => syncQuotaSelectionWithTree(tree, current));
  }, [loaded, tree]);

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
      <Bullseye data-testid="quota-usage-loading">
        <Spinner />
      </Bullseye>
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
                onSelectionChange={setSelection}
              />
            </DrawerPanelContent>
          }
        >
          <DrawerContentBody style={drawerNavBodyStyle}>
            <QuotaUsageNavPanel
              tree={tree}
              selection={selection}
              onSelectionChange={setSelection}
            />
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
};

export default QuotaUsageSection;
