import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  DrawerHead,
  DrawerPanelBody,
  Flex,
  FlexItem,
  Label,
  Stack,
  Title,
} from '@patternfly/react-core';
import { InfrastructureIcon, ListIcon, ResourcesEmptyIcon } from '@patternfly/react-icons';
import { QUOTA_UNASSIGNED_LABEL, QUOTA_UNASSIGNED_TOOLTIP } from '../../const';
import { QuotaSelection, QuotaTreeNode } from '../../types';
import { selectionFromPath } from '../../utils/quotaUsageTreeUtils';

const scrollableBodyClassName = 'pf-v6-u-flex-fill pf-v6-u-min-height-0 pf-v6-u-overflow-auto';

type QuotaUsageDetailPanelProps = {
  tree: QuotaTreeNode[];
  selection?: QuotaSelection;
  onSelectionChange: (selection: QuotaSelection) => void;
};

const QuotaUsageDetailPanel: React.FC<QuotaUsageDetailPanelProps> = ({
  tree,
  selection,
  onSelectionChange,
}) => {
  const handleBreadcrumbClick = React.useCallback(
    (index: number) => {
      if (!selection) {
        return;
      }
      const pathPrefix = selection.path.slice(0, index + 1);
      const nextSelection = selectionFromPath(tree, pathPrefix);
      if (nextSelection) {
        onSelectionChange(nextSelection);
      }
    },
    [onSelectionChange, selection, tree],
  );

  if (!selection) {
    return (
      <DrawerPanelBody className={scrollableBodyClassName}>
        <Content component="p" data-testid="quota-usage-detail-empty">
          Select a cohort or cluster queue to view quota usage details.
        </Content>
      </DrawerPanelBody>
    );
  }

  let displayName: string;
  let typeLabel: string;
  let typeIcon: React.ReactNode;
  let labelColor: 'green' | 'blue' | undefined;

  switch (selection.type) {
    case 'unassigned':
      displayName = QUOTA_UNASSIGNED_LABEL;
      typeLabel = 'Unassigned';
      typeIcon = <ResourcesEmptyIcon aria-hidden />;
      labelColor = undefined;
      break;
    case 'cohort':
      displayName = selection.cohortName;
      typeLabel = 'Cohort';
      typeIcon = <InfrastructureIcon aria-hidden />;
      labelColor = 'green';
      break;
    default:
      displayName = selection.clusterQueueName;
      typeLabel = 'Cluster queue';
      typeIcon = <ListIcon aria-hidden />;
      labelColor = 'blue';
      break;
  }

  const showBreadcrumb = selection.path.length > 1 && selection.path[0] !== QUOTA_UNASSIGNED_LABEL;

  return (
    <>
      <DrawerHead data-testid="quota-usage-detail-panel">
        <Stack hasGutter>
          {showBreadcrumb && (
            <Breadcrumb data-testid="quota-usage-breadcrumb">
              {selection.path.map((segment, index) => {
                const isActive = index === selection.path.length - 1;
                if (isActive) {
                  return (
                    <BreadcrumbItem key={`${segment}-${index}`} isActive>
                      {segment}
                    </BreadcrumbItem>
                  );
                }
                return (
                  <BreadcrumbItem
                    key={`${segment}-${index}`}
                    component="button"
                    onClick={() => handleBreadcrumbClick(index)}
                    data-testid={`quota-usage-breadcrumb-${segment}`}
                  >
                    {segment}
                  </BreadcrumbItem>
                );
              })}
            </Breadcrumb>
          )}
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'wrap' }}
            gap={{ default: 'gapMd' }}
          >
            <FlexItem>
              <Title headingLevel="h2" size="lg" data-testid="quota-usage-detail-title">
                {displayName}
              </Title>
            </FlexItem>
            <FlexItem>
              <Label color={labelColor} variant="filled" isCompact icon={typeIcon}>
                {typeLabel}
              </Label>
            </FlexItem>
          </Flex>
          <Content component="p" data-testid="quota-usage-detail-placeholder">
            {selection.type === 'unassigned'
              ? QUOTA_UNASSIGNED_TOOLTIP
              : 'Summary and accelerator usage details will appear here.'}
          </Content>
        </Stack>
      </DrawerHead>
      <DrawerPanelBody className={scrollableBodyClassName} />
    </>
  );
};

export default QuotaUsageDetailPanel;
