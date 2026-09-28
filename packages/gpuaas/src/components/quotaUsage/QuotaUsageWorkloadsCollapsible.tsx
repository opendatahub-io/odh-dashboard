import * as React from 'react';
import { Content, ContentVariants, Stack, StackItem } from '@patternfly/react-core';
import QuotaUsageAccordionSection from './QuotaUsageAccordionSection';
import {
  CLUSTER_QUEUE_WORKLOADS_SECTION_TITLE,
  CLUSTER_QUEUE_WORKLOADS_TABLE_DESCRIPTION,
} from '../../const';
import ClusterQueueWorkloadsSection from '../clusterQueueWorkloads/ClusterQueueWorkloadsSection';
import type { ClusterQueueWorkloadRow } from '../../types';

type QuotaUsageWorkloadsCollapsibleProps = {
  clusterQueueName: string;
  workloads?: ClusterQueueWorkloadRow[];
  loaded?: boolean;
  error?: Error;
};

const QuotaUsageWorkloadsCollapsible: React.FC<QuotaUsageWorkloadsCollapsibleProps> = ({
  clusterQueueName,
  workloads,
  loaded,
  error,
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
            workloads={workloads}
            loaded={loaded}
            error={error}
          />
        </StackItem>
      </Stack>
    </QuotaUsageAccordionSection>
  );
};

export default QuotaUsageWorkloadsCollapsible;
