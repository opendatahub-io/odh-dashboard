import * as React from 'react';
import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  Stack,
  StackItem,
  Title,
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

  const toggleCohort = (cohortName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cohortName)) {
        next.delete(cohortName);
      } else {
        next.add(cohortName);
      }
      return next;
    });
  };

  return (
    <Stack hasGutter>
      {cohorts.map((cohort) => {
        const acceleratorCQs = filterAcceleratorCQs(cohort.memberClusterQueues);
        const total = getCohortTotalAccelerators(cohort);
        const unallocatedBorrowable = getCohortUnallocatedBorrowable(cohort);
        const borrowLendActive = isCohortBorrowLendActive(cohort);
        const isExpanded = expanded.has(cohort.name);
        const cohortLabel = cohort.name || 'Not in a cohort';

        return (
          <StackItem key={cohort.name || 'standalone'}>
            <Card
              isExpanded={isExpanded}
              variant="secondary"
              data-testid={`cohort-accordion-${cohort.name}`}
            >
              <CardHeader
                onExpand={() => toggleCohort(cohort.name)}
                toggleButtonProps={{
                  id: `cohort-toggle-${cohort.name}`,
                  'aria-label': isExpanded ? `Collapse ${cohortLabel}` : `Expand ${cohortLabel}`,
                  'aria-expanded': isExpanded,
                }}
              >
                <Stack hasGutter>
                  <StackItem>
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <Title headingLevel="h3">{cohortLabel}</Title>
                      </FlexItem>
                      {cohort.name && (
                        <FlexItem>
                          <Title headingLevel="h3" style={{ fontWeight: 'normal' }}>
                            Cohort
                          </Title>
                        </FlexItem>
                      )}
                      <FlexItem>
                        <Content component={ContentVariants.small}>
                          {`${total} accelerators across ${acceleratorCQs.length} cluster queue${
                            acceleratorCQs.length !== 1 ? 's' : ''
                          }`}
                        </Content>
                      </FlexItem>
                      {unallocatedBorrowable > 0 && (
                        <FlexItem>
                          <Content
                            component={ContentVariants.small}
                            data-testid="cohort-unallocated-borrowable"
                          >
                            {`· ${unallocatedBorrowable} available to borrow`}
                          </Content>
                        </FlexItem>
                      )}
                      {borrowLendActive && (
                        <FlexItem>
                          <Label color="purple" isCompact data-testid="cohort-borrow-lend-badge">
                            Borrowing enabled
                          </Label>
                        </FlexItem>
                      )}
                    </Flex>
                  </StackItem>
                  {cohort.state === 'standalone' && (
                    <StackItem>
                      <Content component={ContentVariants.small}>
                        Cluster queues not assigned to a cohort.
                      </Content>
                    </StackItem>
                  )}
                </Stack>
              </CardHeader>

              <CardExpandableContent>
                <CardBody>
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
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>
        );
      })}
    </Stack>
  );
};

export default CohortAccordionGroup;
