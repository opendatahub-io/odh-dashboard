import * as React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  FormGroup,
  Grid,
  GridItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import { getMetricDisplayName } from '~/app/components/benchmarkUtils';
import { clampNumSamples, type CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';

import './BenchmarkConfigAccordion.scss';

type BenchmarkConfigAccordionProps = {
  benchmarks: CopySuiteBenchmark[];
  onUpdate: (index: number, field: keyof CopySuiteBenchmark, value: unknown) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
};

const BenchmarkConfigAccordion: React.FC<BenchmarkConfigAccordionProps> = ({
  benchmarks,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  const [expanded, setExpanded] = React.useState<Set<number>>(
    () => new Set(benchmarks.map((_, i) => i)),
  );
  const [metricOpenIndex, setMetricOpenIndex] = React.useState<number | null>(null);

  const toggleExpand = React.useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  if (benchmarks.length === 0) {
    return (
      <Content component="p" data-testid="no-benchmarks-message">
        No benchmarks configured. Add benchmarks to continue.
      </Content>
    );
  }

  return (
    <div className="evalhub-benchmark-config-accordion" data-testid="benchmark-config-accordion">
      {benchmarks.map((benchmark, index) => {
        const isExpanded = expanded.has(index);
        const itemId = `benchmark-${index}`;

        return (
          <div key={`${benchmark.id}-${index}`} data-testid={`benchmark-item-${index}`}>
            <Flex
              alignItems={{ default: 'alignItemsFlexStart' }}
              className="evalhub-benchmark-config-accordion__row"
            >
              <FlexItem className="evalhub-benchmark-config-accordion__main">
                <Flex
                  alignItems={{ default: 'alignItemsFlexStart' }}
                  gap={{ default: 'gapSm' }}
                  className="evalhub-benchmark-config-accordion__header"
                >
                  <FlexItem>
                    <Button
                      variant="plain"
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded ? `Collapse ${benchmark.name}` : `Expand ${benchmark.name}`
                      }
                      data-testid={`benchmark-expand-toggle-${index}`}
                      className="evalhub-benchmark-config-accordion__expand-toggle"
                      onClick={() => toggleExpand(index)}
                    >
                      {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                    </Button>
                  </FlexItem>
                  <FlexItem className="evalhub-benchmark-config-accordion__content">
                    <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
                      <FlexItem>
                        <Title
                          headingLevel="h3"
                          size="md"
                          className="evalhub-benchmark-config-accordion__title"
                        >
                          {benchmark.name}
                        </Title>
                        <Content
                          component="p"
                          className="evalhub-benchmark-config-accordion__benchmark-id"
                        >
                          {benchmark.providerId ? `${benchmark.providerId}-` : ''}
                          {benchmark.id}
                        </Content>
                      </FlexItem>
                      {isExpanded ? (
                        <FlexItem className="evalhub-benchmark-config-accordion__fields">
                          {benchmark.availableMetrics.length > 0 ? (
                            <FormGroup label="Primary metric" fieldId={`${itemId}-metric`}>
                              <Select
                                id={`${itemId}-metric-menu`}
                                data-testid={`benchmark-metric-select-${index}`}
                                isOpen={metricOpenIndex === index}
                                selected={benchmark.primaryMetric}
                                onSelect={(_event, value) => {
                                  if (typeof value === 'string') {
                                    onUpdate(index, 'primaryMetric', value);
                                  }
                                  setMetricOpenIndex(null);
                                }}
                                onOpenChange={(open) => setMetricOpenIndex(open ? index : null)}
                                toggle={(toggleRef) => (
                                  <MenuToggle
                                    ref={toggleRef}
                                    onClick={() =>
                                      setMetricOpenIndex((prev) => (prev === index ? null : index))
                                    }
                                    isExpanded={metricOpenIndex === index}
                                    isFullWidth
                                    data-testid={`benchmark-metric-toggle-${index}`}
                                  >
                                    {benchmark.primaryMetric
                                      ? getMetricDisplayName(benchmark.primaryMetric)
                                      : 'Select metric'}
                                  </MenuToggle>
                                )}
                                shouldFocusToggleOnSelect
                              >
                                <SelectList>
                                  {benchmark.availableMetrics.map((metric) => (
                                    <SelectOption
                                      key={metric}
                                      value={metric}
                                      isSelected={benchmark.primaryMetric === metric}
                                    >
                                      {getMetricDisplayName(metric)}
                                    </SelectOption>
                                  ))}
                                </SelectList>
                              </Select>
                            </FormGroup>
                          ) : null}

                          <Grid hasGutter>
                            <GridItem span={6}>
                              <FormGroup label="Number of samples" fieldId={`${itemId}-samples`}>
                                <TextInput
                                  id={`${itemId}-samples`}
                                  data-testid={`benchmark-samples-input-${index}`}
                                  type="number"
                                  min={1}
                                  max={benchmark.datasetSize}
                                  value={benchmark.numSamples ?? ''}
                                  onChange={(_e, val) => {
                                    if (val === '') {
                                      onUpdate(index, 'numSamples', undefined);
                                      return;
                                    }
                                    const num = Number(val);
                                    onUpdate(
                                      index,
                                      'numSamples',
                                      clampNumSamples(num, benchmark.datasetSize),
                                    );
                                  }}
                                />
                              </FormGroup>
                            </GridItem>
                            <GridItem span={6}>
                              <FormGroup label="Random seed" fieldId={`${itemId}-seed`}>
                                <TextInput
                                  id={`${itemId}-seed`}
                                  data-testid={`benchmark-seed-input-${index}`}
                                  type="number"
                                  value={benchmark.randomSeed ?? ''}
                                  onChange={(_e, val) => {
                                    const num = val === '' ? undefined : Number(val);
                                    onUpdate(index, 'randomSeed', num);
                                  }}
                                />
                              </FormGroup>
                            </GridItem>
                          </Grid>

                          <BenchmarkThresholdField
                            value={benchmark.threshold}
                            onChange={(val) => onUpdate(index, 'threshold', val)}
                            label="Threshold"
                            description="Minimum score required to pass this evaluation."
                            fieldId={`${itemId}-threshold`}
                          />
                        </FlexItem>
                      ) : null}
                    </Flex>
                  </FlexItem>
                </Flex>
              </FlexItem>
              {canRemove ? (
                <FlexItem className="evalhub-benchmark-config-accordion__remove">
                  <Button
                    variant="link"
                    isInline
                    isDanger
                    data-testid={`remove-benchmark-${index}`}
                    onClick={() => onRemove(index)}
                  >
                    Remove
                  </Button>
                </FlexItem>
              ) : null}
            </Flex>
          </div>
        );
      })}
    </div>
  );
};

export default BenchmarkConfigAccordion;
