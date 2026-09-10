import * as React from 'react';
import { Content, ContentVariants, Stack, StackItem } from '@patternfly/react-core';
import QuotaUsageAccordionSection from './QuotaUsageAccordionSection';
import {
  CLUSTER_QUEUE_WORKLOADS_SECTION_TITLE,
  CLUSTER_QUEUE_WORKLOADS_TABLE_DESCRIPTION,
} from '../../const';
import ClusterQueueWorkloadsSection from '../clusterQueueWorkloads/ClusterQueueWorkloadsSection';

type QuotaUsageWorkloadsCollapsibleProps = {
  clusterQueueName: string;
};

const QuotaUsageWorkloadsCollapsible: React.FC<QuotaUsageWorkloadsCollapsibleProps> = ({
  clusterQueueName,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <QuotaUsageAccordionSection
      id="quota-usage-workloads"
      title={CLUSTER_QUEUE_WORKLOADS_SECTION_TITLE}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded((expanded) => !expanded)}
      data-testid="quota-usage-workloads-section"
    >
      <Stack hasGutter>
        <StackItem>
          <Content component={ContentVariants.p}>
            {CLUSTER_QUEUE_WORKLOADS_TABLE_DESCRIPTION}
          </Content>
        </StackItem>
        <StackItem>
          <ClusterQueueWorkloadsSection
            clusterQueueName={clusterQueueName}
            showDescription={false}
          />
        </StackItem>
      </Stack>
    </QuotaUsageAccordionSection>
  );
};

export default QuotaUsageWorkloadsCollapsible;
