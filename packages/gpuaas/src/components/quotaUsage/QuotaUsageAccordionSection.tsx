import * as React from 'react';
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

type QuotaUsageAccordionSectionProps = {
  id: string;
  title: React.ReactNode;
  headerActions?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  'data-testid'?: string;
  children: React.ReactNode;
  isSummary?: boolean;
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
            <AccordionToggle id={`${id}-toggle`} onClick={onToggle}>
              <Content component="h4">{title}</Content>
            </AccordionToggle>
          </FlexItem>
          {headerActions ? (
            <FlexItem className="pf-v6-u-flex-shrink-0 pf-v6-u-pr-md">{headerActions}</FlexItem>
          ) : null}
        </Flex>
        <AccordionContent
          id={isSummary ? undefined : `${id}-content`}
          className={isSummary ? 'gpuaas-quota-usage-summary-content' : undefined}
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
      className="pf-v6-u-w-100 pf-v6-u-py-xs"
      data-testid={testId}
    >
      {accordion}
    </Card>
  );
};

export default QuotaUsageAccordionSection;
