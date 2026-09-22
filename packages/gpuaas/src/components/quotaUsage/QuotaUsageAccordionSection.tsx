import * as React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Card,
  Content,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  GPUAAS_EVENTS,
  QUOTA_USAGE_DETAIL_SECTION_NAMES_BY_ID,
  QUOTA_USAGE_DETAIL_SECTION_IDS,
  QUOTA_NODE_TYPE_TRACKING,
} from '../../tracking/gpuaasTrackingConstants';
import { QUOTA_NODE_TYPE, QuotaNodeType } from '../../types';

type QuotaUsageAccordionSectionProps = {
  id: (typeof QUOTA_USAGE_DETAIL_SECTION_IDS)[keyof typeof QUOTA_USAGE_DETAIL_SECTION_IDS];
  title: React.ReactNode;
  headerActions?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  'data-testid'?: string;
  children: React.ReactNode;
  isSummary?: boolean;
  contentClassName?: string;
  nodeType?: QuotaNodeType;
};

const QuotaUsageAccordionSection: React.FC<QuotaUsageAccordionSectionProps> = ({
  id,
  title,
  headerActions,
  isExpanded,
  onToggle,
  'data-testid': testId,
  children,
  isSummary = false,
  contentClassName,
  nodeType = QUOTA_NODE_TYPE.clusterQueue,
}) => {
  const accordion = (
    <Accordion
      asDefinitionList={false}
      togglePosition="start"
      isPlain={!isSummary}
      data-testid={isSummary ? undefined : testId}
    >
      <AccordionItem isExpanded={isExpanded}>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'nowrap' }}
          className="pf-v6-u-w-100"
        >
          <FlexItem className="pf-v6-u-flex-fill pf-v6-u-min-width-0">
            <AccordionToggle
              id={`${id}-toggle`}
              onClick={() => {
                fireMiscTrackingEvent(GPUAAS_EVENTS.QUOTA_USAGE_DETAIL_SECTION_TOGGLED, {
                  sectionName: QUOTA_USAGE_DETAIL_SECTION_NAMES_BY_ID[id],
                  isExpanded: !isExpanded,
                  nodeType: QUOTA_NODE_TYPE_TRACKING[nodeType],
                });
                onToggle();
              }}
            >
              <Content component="h4">{title}</Content>
            </AccordionToggle>
          </FlexItem>
          {headerActions ? (
            <FlexItem className="pf-v6-u-flex-shrink-0 pf-v6-u-pr-md">{headerActions}</FlexItem>
          ) : null}
        </Flex>
        <AccordionContent
          id={isSummary ? undefined : `${id}-content`}
          className={
            [isSummary ? 'gpuaas-quota-usage-summary-content' : undefined, contentClassName]
              .filter(Boolean)
              .join(' ') || undefined
          }
        >
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  if (!isSummary) {
    return accordion;
  }

  return (
    <Card
      variant="secondary"
      isPlain
      id={`${id}-content`}
      className="pf-v6-u-w-100"
      data-testid={testId}
    >
      {accordion}
    </Card>
  );
};

export default QuotaUsageAccordionSection;
