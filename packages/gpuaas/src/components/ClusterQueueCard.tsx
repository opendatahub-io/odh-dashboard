import * as React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import {
  chart_color_blue_300 as chartColorBlue,
  chart_color_purple_100 as chartColorPurple,
  chart_color_orange_100 as chartColorOrange,
} from '@patternfly/react-tokens';
import { ClusterQueueKind } from '@odh-dashboard/k8s-core';
import AcceleratorDonutChart from './AcceleratorDonutChart';
import {
  BorrowLendBadge,
  ChartColumn,
  DcgmDonut,
  PerModelDcgmData,
} from './ClusterQueueChartComponents';
import { ModelGpuCount } from '../utils/hardwareModels';
import {
  AcceleratorDonutType,
  AcceleratorSegment,
  formatWorkloadCounts,
  getAcceleratorDonutConfig,
  getBorrowLendBadgeState,
  getBorrowLendInfo,
  isInCohort,
} from '../utils/clusterQueueUtils';

type ClusterQueueCardProps = {
  cq: ClusterQueueKind;
  hardwareModels: string[];
  perModelGpus?: ModelGpuCount[];
  counterpartCQNames?: string[];
  /** True when the DCGM service is present; controls whether the two chart columns render at all. */
  dcgmAvailable?: boolean;
  computeUtilization?: number | null;
  memoryUtilization?: number | null;
  perModelComputeDcgm?: PerModelDcgmData[];
  perModelMemoryDcgm?: PerModelDcgmData[];
};

const LEGEND_COLORS: Record<string, string> = {
  [AcceleratorSegment.Own]: chartColorBlue.value,
  [AcceleratorSegment.Borrowed]: chartColorOrange.value,
  [AcceleratorSegment.Lent]: chartColorPurple.value,
};

const ClusterQueueCard: React.FC<ClusterQueueCardProps> = ({
  cq,
  hardwareModels,
  perModelGpus = [],
  counterpartCQNames = [],
  dcgmAvailable = false,
  computeUtilization,
  memoryUtilization,
  perModelComputeDcgm = [],
  perModelMemoryDcgm = [],
}) => {
  const name = cq.metadata?.name ?? '';
  const admitted = cq.status?.admittedWorkloads ?? 0;
  const pending = cq.status?.pendingWorkloads ?? 0;
  const cqIsInCohort = isInCohort(cq);

  const donutConfig = getAcceleratorDonutConfig(cq, cqIsInCohort);
  const { borrowing, lending, lentCount, borrowedCount } = getBorrowLendBadgeState(donutConfig);

  const borrowLendInfo = getBorrowLendInfo(donutConfig);
  const legendSeriesNames =
    donutConfig.type === AcceleratorDonutType.BorrowLend
      ? donutConfig.isBorrowing
        ? [AcceleratorSegment.Own, AcceleratorSegment.Borrowed]
        : [AcceleratorSegment.Own, AcceleratorSegment.Lent]
      : [];
  const legendItems = legendSeriesNames.map((seriesName) => ({
    name: seriesName,
    color: LEGEND_COLORS[seriesName],
  }));

  return (
    <Card isCompact data-testid={`cq-card-${name}`}>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem>{name}</FlexItem>
          {hardwareModels.length > 0 && (
            <FlexItem>
              <LabelGroup>
                {hardwareModels.map((model) => (
                  <Label
                    key={model}
                    color="blue"
                    variant="outline"
                    isCompact
                    data-testid={`hardware-model-badge-${model}`}
                  >
                    {model}
                  </Label>
                ))}
              </LabelGroup>
            </FlexItem>
          )}
          {lending && cqIsInCohort && (
            <FlexItem>
              <BorrowLendBadge
                type="lent"
                count={lentCount}
                models={hardwareModels}
                perModelGpus={perModelGpus}
                counterpartCQNames={counterpartCQNames}
              />
            </FlexItem>
          )}
          {borrowing && (
            <FlexItem>
              <BorrowLendBadge
                type="borrowed"
                count={borrowedCount}
                models={hardwareModels}
                perModelGpus={perModelGpus}
                counterpartCQNames={counterpartCQNames}
              />
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Content component={ContentVariants.small} data-testid="cq-workload-counts">
              {formatWorkloadCounts(admitted, pending)}
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex
              flexWrap={{ default: 'nowrap' }}
              justifyContent={{ default: 'justifyContentSpaceEvenly' }}
              spaceItems={{ default: 'spaceItemsNone' }}
              style={{ overflowX: 'auto', overflowY: 'hidden' }}
            >
              <ChartColumn label="Total accelerators">
                <AcceleratorDonutChart
                  config={donutConfig}
                  cqName={name}
                  perModelGpus={perModelGpus}
                />
              </ChartColumn>
              {dcgmAvailable && (
                <ChartColumn label="Compute consumption">
                  <DcgmDonut
                    percentage={computeUtilization}
                    ariaLabel="Accelerator compute consumption"
                    borrowLendInfo={borrowLendInfo}
                    perModelData={perModelComputeDcgm}
                    testId="dcgm-compute-donut"
                  />
                </ChartColumn>
              )}
              {dcgmAvailable && (
                <ChartColumn label="Memory consumption">
                  <DcgmDonut
                    percentage={memoryUtilization}
                    ariaLabel="Accelerator memory consumption"
                    borrowLendInfo={borrowLendInfo}
                    perModelData={perModelMemoryDcgm}
                    testId="dcgm-memory-donut"
                  />
                </ChartColumn>
              )}
            </Flex>
          </FlexItem>

          {legendItems.length > 0 && (
            <FlexItem>
              <Flex
                justifyContent={{ default: 'justifyContentCenter' }}
                spaceItems={{ default: 'spaceItemsMd' }}
              >
                {legendItems.map((item) => (
                  <FlexItem key={item.name}>
                    <Content
                      component={ContentVariants.small}
                      data-testid={`legend-item-${item.name.toLowerCase()}`}
                    >
                      <span style={{ color: item.color }}>&#9679;</span> {item.name}
                    </Content>
                  </FlexItem>
                ))}
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
};

export default ClusterQueueCard;
