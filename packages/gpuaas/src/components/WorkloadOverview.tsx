import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Alert,
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Popover,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import {
  t_chart_color_green_300 as chartGreen,
  t_chart_color_blue_300 as chartBlue,
  t_chart_color_yellow_300 as chartYellow,
  t_chart_color_orange_300 as chartOrange,
  t_chart_global_danger_color_100 as chartRed,
} from '@patternfly/react-tokens';
import {
  overviewBuckets,
  summarizeOverview,
  type OverviewBucket,
  type WorkloadOverviewRow,
} from '../utils/workloadOverview';
import './InfrastructureWorkloadsSection.scss';

const labels: Record<OverviewBucket, string> = {
  completed: 'Completed',
  active: 'Active',
  waiting: 'Waiting',
  blockers: 'Blockers',
  failed: 'Failed',
};
const colors: Record<OverviewBucket, string> = {
  completed: chartGreen.var,
  active: chartBlue.var,
  waiting: chartYellow.var,
  blockers: chartOrange.var,
  failed: chartRed.var,
};

type Props = {
  workloads: WorkloadOverviewRow[];
  loaded: boolean;
  dataUnavailable?: boolean;
  partial: boolean;
  error?: Error;
  /** Integration point for the separate table ticket. */
  onViewInTable?: (bucket: OverviewBucket) => void;
};

const WorkloadOverview: React.FC<Props> = ({
  workloads,
  loaded,
  dataUnavailable,
  partial,
  error,
  onViewInTable,
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const { counts, details, total } = React.useMemo(() => summarizeOverview(workloads), [workloads]);

  return (
    <Card data-testid="infrastructure-workloads">
      <CardBody>
        <Accordion
          asDefinitionList={false}
          togglePosition="start"
          isPlain
          className="gpuaas-workload-overview"
          data-testid="workload-overview-accordion"
        >
          <AccordionItem isExpanded={expanded}>
            <AccordionToggle
              id="workload-overview-toggle"
              className="gpuaas-workload-overview__toggle"
              onClick={() => setExpanded(!expanded)}
            >
              <Content component="h2">Workload overview</Content>
            </AccordionToggle>
            <AccordionContent id="workload-overview-content">
              {dataUnavailable ? (
                <EmptyState titleText="Workload data not connected" headingLevel="h3">
                  <EmptyStateBody>
                    The workload table must provide its data before the overview can show counts.
                  </EmptyStateBody>
                </EmptyState>
              ) : error ? (
                <Alert variant="danger" title="Unable to load workload overview">
                  {error.message}
                </Alert>
              ) : !loaded ? (
                <Spinner aria-label="Loading workload overview" />
              ) : (
                <>
                  {partial && (
                    <Alert variant="warning" isInline title="Some workloads could not be loaded">
                      Counts include only workload types you can access and resources that loaded
                      successfully.
                    </Alert>
                  )}
                  <Tabs activeKey="status" aria-label="Workload overview tabs">
                    <Tab eventKey="status" title={<TabTitleText>Status</TabTitleText>}>
                      {total === 0 ? (
                        <EmptyState titleText="No workloads" headingLevel="h3">
                          <EmptyStateBody>
                            Supported workloads in this project will appear here.
                          </EmptyStateBody>
                        </EmptyState>
                      ) : (
                        <div
                          className="gpuaas-workload-overview__status"
                          data-testid="workload-overview-status"
                        >
                          <Flex
                            className="gpuaas-workload-overview__counts"
                            alignItems={{ default: 'alignItemsCenter' }}
                          >
                            <FlexItem className="gpuaas-workload-overview__total">
                              <Content component="h3">{total}</Content>
                              <Content component="p">Total workloads</Content>
                            </FlexItem>
                            {overviewBuckets.map((bucket) => (
                              <FlexItem key={bucket} className="gpuaas-workload-overview__count">
                                <Content component="h3" data-testid={`workload-count-${bucket}`}>
                                  {counts[bucket]}
                                </Content>
                                <Content component="p">{labels[bucket]}</Content>
                              </FlexItem>
                            ))}
                          </Flex>
                          <div
                            className="gpuaas-workload-overview__bar"
                            role="group"
                            aria-label="Workloads by status"
                          >
                            {overviewBuckets
                              .filter((bucket) => counts[bucket] > 0)
                              .map((bucket) => {
                                const percentage = Math.round((counts[bucket] / total) * 100);
                                return (
                                  <div
                                    key={bucket}
                                    className="gpuaas-workload-overview__bar-item"
                                    style={{ flexGrow: counts[bucket] }}
                                  >
                                    <Popover
                                      aria-label={`${labels[bucket]} workloads`}
                                      headerContent={`${labels[bucket]} workloads`}
                                      bodyContent={
                                        <div>
                                          {onViewInTable && (
                                            <Button
                                              variant="link"
                                              isInline
                                              onClick={() => onViewInTable(bucket)}
                                            >
                                              View in table
                                            </Button>
                                          )}
                                          {Object.entries(details[bucket]).map(
                                            ([detail, count]) => (
                                              <Content component="p" key={detail}>
                                                {count} {detail}
                                              </Content>
                                            ),
                                          )}
                                        </div>
                                      }
                                    >
                                      <button
                                        type="button"
                                        data-testid={`workload-segment-${bucket}`}
                                        className="gpuaas-workload-overview__segment"
                                        style={{ backgroundColor: colors[bucket] }}
                                        data-status={bucket}
                                        aria-label={`${labels[bucket]}: ${counts[bucket]} of ${total} workloads (${percentage}%)`}
                                      >
                                        {percentage >= 6 ? `${percentage}%` : null}
                                      </button>
                                    </Popover>
                                  </div>
                                );
                              })}
                          </div>
                          <Flex
                            className="gpuaas-workload-overview__legend"
                            spaceItems={{ default: 'spaceItemsLg' }}
                          >
                            {overviewBuckets.map((bucket) => (
                              <FlexItem key={bucket}>
                                <span
                                  className="gpuaas-workload-overview__swatch"
                                  style={{ backgroundColor: colors[bucket] }}
                                />
                                {labels[bucket]}
                              </FlexItem>
                            ))}
                          </Flex>
                        </div>
                      )}
                    </Tab>
                  </Tabs>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  );
};

export default WorkloadOverview;
