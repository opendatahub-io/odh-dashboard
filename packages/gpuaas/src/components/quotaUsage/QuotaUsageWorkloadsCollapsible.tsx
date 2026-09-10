import * as React from 'react';
import {
  Content,
  ContentVariants,
  ExpandableSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  CLUSTER_QUEUE_WORKLOADS_SECTION_TITLE,
  CLUSTER_QUEUE_WORKLOADS_TABLE_DESCRIPTION,
} from '../../const';
import ClusterQueueWorkloadsSection from '../clusterQueueWorkloads/ClusterQueueWorkloadsSection';

type QuotaUsageWorkloadsCollapsibleProps = {
  clusterQueueName: string;
};

/** Lightweight ExpandableSection disclosure matching the Quota usage prototype. */
const QuotaUsageWorkloadsCollapsible: React.FC<QuotaUsageWorkloadsCollapsibleProps> = ({
  clusterQueueName,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <ExpandableSection
      className="gpuaas-quota-usage-detail-section pf-v6-u-mt-xl"
      data-testid="quota-usage-workloads-section"
      toggleContent={CLUSTER_QUEUE_WORKLOADS_SECTION_TITLE}
      toggleWrapper="h4"
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
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
    </ExpandableSection>
  );
};

export default QuotaUsageWorkloadsCollapsible;
