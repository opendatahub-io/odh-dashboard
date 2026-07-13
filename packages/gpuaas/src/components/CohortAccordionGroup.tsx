import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
} from '@patternfly/react-core';
import ClusterQueueCard from './ClusterQueueCard';
import { CQDcgmResult, UnifiedCohort } from '../types';
import { ModelGpuCount } from '../utils/hardwareModels';
import {
  filterAcceleratorCQs,
  getCohortTotalAccelerators,
  getCohortUnallocatedBorrowable,
  getCounterpartCQNames,
  isCohortBorrowLendActive,
  resolveCQDcgmUtilization,
  resolvePerModelDcgmData,
} from '../utils/clusterQueueUtils';

type CohortAccordionGroupProps = {
  cohorts: UnifiedCohort[];
  hardwareModelsByCQ: Map<string, string[]>;
  perModelGpusByCQ: Map<string, ModelGpuCount[]>;
  /** Per-GPU-model DCGM metrics. Undefined = DCGM unavailable, hide the chart columns. */
  dcgmByModel?: Map<string, CQDcgmResult>;
};

const CohortAccordionGroup: React.FC<CohortAccordionGroupProps> = ({
  cohorts,
  hardwareModelsByCQ,
  perModelGpusByCQ,
  dcgmByModel,
}) => {
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(cohorts.map((c) => c.name)),
  );

  const toggleAccordion = (cohortName: string) => {
    setExpanded((prev) => {
      const expandedCohortNames = new Set(prev);
      if (expandedCohortNames.has(cohortName)) {
        expandedCohortNames.delete(cohortName);
      } else {
        expandedCohortNames.add(cohortName);
      }
      return expandedCohortNames;
    });
  };

  return (
    <Accordion asDefinitionList={false} isBordered={false} togglePosition="start">
      {cohorts.map((cohort) => {
        const acceleratorCQs = filterAcceleratorCQs(cohort.memberClusterQueues);
        const total = getCohortTotalAccelerators(cohort);
        const unallocatedBorrowable = getCohortUnallocatedBorrowable(cohort);
        const borrowLendActive = isCohortBorrowLendActive(cohort);
        const isExpanded = expanded.has(cohort.name);
        const cohortLabel = cohort.name || 'Not in a cohort';

        return (
          <AccordionItem
            key={cohort.name || 'standalone'}
            isExpanded={isExpanded}
            data-testid={`cohort-accordion-${cohort.name}`}
          >
            <AccordionToggle
              onClick={() => toggleAccordion(cohort.name)}
              id={`cohort-toggle-${cohort.name}`}
            >
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  {cohortLabel}
                  <Content component={ContentVariants.small} style={{ display: 'inline' }}>
                    {` · ${total} total accelerators`}
                    {unallocatedBorrowable > 0 && (
                      <Content
                        component={ContentVariants.small}
                        style={{ display: 'inline' }}
                        data-testid="cohort-unallocated-borrowable"
                      >
                        {` · ${unallocatedBorrowable} unallocated, borrowable`}
                      </Content>
                    )}
                  </Content>
                </FlexItem>
                {borrowLendActive && (
                  <FlexItem>
                    <Label color="purple" isCompact data-testid="cohort-borrow-lend-badge">
                      Borrow / lend active
                    </Label>
                  </FlexItem>
                )}
              </Flex>
            </AccordionToggle>

            <AccordionContent id={`cohort-content-${cohort.name}`}>
              {cohort.state === 'standalone' && (
                <Content component={ContentVariants.small}>
                  Cluster queues not assigned to a Kueue cohort.
                </Content>
              )}
              {acceleratorCQs.length > 0 ? (
                <Grid hasGutter>
                  {acceleratorCQs.map((cq) => {
                    const cqName = cq.metadata?.name ?? '';
                    const models = hardwareModelsByCQ.get(cqName) ?? [];
                    const perModelGpus = perModelGpusByCQ.get(cqName) ?? [];

                    const dcgmAvailable = dcgmByModel !== undefined;
                    const { computeUtilization, memoryUtilization } =
                      dcgmAvailable && models.length > 0
                        ? resolveCQDcgmUtilization(models, dcgmByModel)
                        : { computeUtilization: undefined, memoryUtilization: undefined };

                    const { compute: perModelComputeDcgm, memory: perModelMemoryDcgm } =
                      resolvePerModelDcgmData(models, dcgmByModel);

                    // 1 card → full width; 2+ → half each so they always fill the row
                    const span = acceleratorCQs.length === 1 ? 12 : 6;

                    // Use all member CQs (not just accelerator-filtered ones) so borrowing CQs
                    // with nominal=0 GPU quota are still found as counterparts.
                    const counterpartCQNames = getCounterpartCQNames(
                      cq,
                      cohort.memberClusterQueues,
                    );

                    return (
                      <GridItem key={cqName} span={span}>
                        <ClusterQueueCard
                          cq={cq}
                          hardwareModels={models}
                          perModelGpus={perModelGpus}
                          counterpartCQNames={counterpartCQNames}
                          dcgmAvailable={dcgmAvailable}
                          computeUtilization={computeUtilization}
                          memoryUtilization={memoryUtilization}
                          perModelComputeDcgm={perModelComputeDcgm}
                          perModelMemoryDcgm={perModelMemoryDcgm}
                        />
                      </GridItem>
                    );
                  })}
                </Grid>
              ) : (
                <Content component={ContentVariants.small}>
                  No accelerator cluster queues in this cohort.
                </Content>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default CohortAccordionGroup;
