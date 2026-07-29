import * as React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Popover,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import {
  LatencyMetric,
  LatencyPercentile,
  getLatencyFilterKey,
  ALL_LATENCY_FILTER_KEYS,
  parseLatencyFilterKey,
  LatencyMetricLabels,
  latencyMetricDescriptions,
} from '~/concepts/modelCatalog/const';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import {
  FALLBACK_LATENCY_RANGE,
  SliderRange,
  formatLatency,
} from '~/app/pages/modelCatalog/utils/performanceMetricsUtils';
import { getDefaultPerformanceFilters } from '~/app/pages/modelCatalog/utils/performanceFilterUtils';
import useDropdownAutoFocus from '~/app/pages/modelCatalog/hooks/useDropdownAutoFocus';
import SliderWithInput from './SliderWithInput';

type LatencyFilterState = {
  metric: LatencyMetric;
  percentile: LatencyPercentile;
  value: number;
};
type MetricOption = {
  value: LatencyMetric;
  label: string;
  description: string;
};

const METRIC_OPTIONS: MetricOption[] = [
  LatencyMetric.TTFT,
  LatencyMetric.E2E,
  LatencyMetric.ITL,
].map((metric) => ({
  value: metric,
  label: LatencyMetricLabels[metric] ?? metric,
  description: latencyMetricDescriptions[metric] ?? '',
}));

const PERCENTILE_OPTIONS: { value: LatencyPercentile; label: LatencyPercentile }[] = Object.values(
  LatencyPercentile,
).map((percentile) => ({ value: percentile, label: percentile }));

const LatencyFilter: React.FC = () => {
  const { filters, setFilters, filterOptions } = React.useContext(ModelCatalogContext);
  const [isOpen, setIsOpen] = React.useState(false);
  const contentRef = useDropdownAutoFocus(isOpen);
  const [isMetricOpen, setIsMetricOpen] = React.useState(false);
  const [isPercentileOpen, setIsPercentileOpen] = React.useState(false);

  const isInnerDropdownOpenRef = React.useRef(false);
  isInnerDropdownOpenRef.current = isMetricOpen || isPercentileOpen;

  const handleOuterOpenChange = React.useCallback((open: boolean) => {
    if (!open && isInnerDropdownOpenRef.current) {
      return;
    }
    setIsOpen(open);
  }, []);

  // Show all available metrics - in production this could be filtered based on backend data
  const availableMetrics = React.useMemo(() => METRIC_OPTIONS, []);

  // Show all available percentiles - in production this could be filtered based on backend data
  const getAvailablePercentiles = React.useCallback(() => PERCENTILE_OPTIONS, []);

  // Find the currently active latency filter (if any)
  const currentActiveFilter = React.useMemo(() => {
    for (const metric of Object.values(LatencyMetric)) {
      for (const percentile of Object.values(LatencyPercentile)) {
        const filterKey = getLatencyFilterKey(metric, percentile);
        const value = filters[filterKey];
        if (value !== undefined && typeof value === 'number') {
          return { fieldName: filterKey, metric, percentile, value };
        }
      }
    }
    return null;
  }, [filters]);

  const defaultFilterState = React.useMemo(() => {
    // Find the default latency filter from namedQueries
    const defaults = getDefaultPerformanceFilters(filterOptions);
    for (const latencyKey of ALL_LATENCY_FILTER_KEYS) {
      const defaultValue = defaults[latencyKey];
      if (typeof defaultValue === 'number') {
        const { metric, percentile } = parseLatencyFilterKey(latencyKey);
        return { metric, percentile, value: defaultValue };
      }
    }
    // Fallback if no default found in namedQueries
    return {
      metric: LatencyMetric.TTFT,
      percentile: LatencyPercentile.P90,
      value: 30,
    };
  }, [filterOptions]);

  // Working state while editing the filter
  const [localFilter, setLocalFilter] = React.useState<LatencyFilterState>(() => {
    if (currentActiveFilter) {
      return {
        metric: currentActiveFilter.metric,
        percentile: currentActiveFilter.percentile,
        value: currentActiveFilter.value,
      };
    }
    return defaultFilterState;
  });

  React.useEffect(() => {
    if (isOpen) {
      // Use currentActiveFilter or defaultFilterState
      const initialState = currentActiveFilter
        ? {
            metric: currentActiveFilter.metric,
            percentile: currentActiveFilter.percentile,
            value: currentActiveFilter.value,
          }
        : defaultFilterState;
      setLocalFilter(initialState);
    }
  }, [isOpen, currentActiveFilter, defaultFilterState]);

  const { minValue, maxValue, isSliderDisabled } = React.useMemo((): SliderRange => {
    const filterKey = getLatencyFilterKey(localFilter.metric, localFilter.percentile);

    const latencyFilter = filterOptions?.filters?.[filterKey];
    if (latencyFilter && 'range' in latencyFilter && latencyFilter.range) {
      return {
        minValue: Math.round(latencyFilter.range.min ?? FALLBACK_LATENCY_RANGE.minValue),
        maxValue: Math.round(latencyFilter.range.max ?? FALLBACK_LATENCY_RANGE.maxValue),
        isSliderDisabled: false,
      };
    }
    return FALLBACK_LATENCY_RANGE;
  }, [localFilter.metric, localFilter.percentile, filterOptions]);

  // Reset value to max when metric or percentile changes (range changes)
  // This ensures the value is always valid for the current range
  const prevMetricRef = React.useRef(localFilter.metric);
  const prevPercentileRef = React.useRef(localFilter.percentile);

  React.useEffect(() => {
    const metricChanged = prevMetricRef.current !== localFilter.metric;
    const percentileChanged = prevPercentileRef.current !== localFilter.percentile;

    if (metricChanged || percentileChanged) {
      setLocalFilter((prev) => ({ ...prev, value: maxValue }));
      prevMetricRef.current = localFilter.metric;
      prevPercentileRef.current = localFilter.percentile;
    }
  }, [localFilter.metric, localFilter.percentile, maxValue]);

  const clampedValue = React.useMemo(
    () => Math.min(Math.max(localFilter.value, minValue), maxValue),
    [localFilter.value, minValue, maxValue],
  );
  const getDisplayText = (): React.ReactNode => {
    if (currentActiveFilter) {
      // When there's an active filter, show the full specification with actual selected values
      return (
        <>
          <strong>Latency:</strong> {currentActiveFilter.metric} at {currentActiveFilter.percentile}{' '}
          ≤ {formatLatency(currentActiveFilter.value)}
        </>
      );
    }
    return 'Latency';
  };

  const handleApplyFilter = () => {
    // Clear any existing latency filter and set the new one
    setFilters((prev) => {
      const next = { ...prev };
      if (currentActiveFilter) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- dynamic latency filter key
        (next as Record<string, unknown>)[currentActiveFilter.fieldName] = undefined;
      }
      const newFilterKey = getLatencyFilterKey(localFilter.metric, localFilter.percentile);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- dynamic latency filter key
      (next as Record<string, unknown>)[newFilterKey] = localFilter.value;
      return next;
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    // Reset to the filter state that was active when menu opened
    const resetState = currentActiveFilter
      ? {
          metric: currentActiveFilter.metric,
          percentile: currentActiveFilter.percentile,
          value: currentActiveFilter.value,
        }
      : defaultFilterState;
    setLocalFilter(resetState);
    // Update the refs so the useEffect doesn't think metric/percentile changed
    // This prevents the value from being reset to maxValue
    prevMetricRef.current = resetState.metric;
    prevPercentileRef.current = resetState.percentile;
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      data-testid="latency-filter"
      onClick={() => setIsOpen(!isOpen)}
      isExpanded={isOpen}
      isFullHeight
      style={{ minWidth: '200px', width: 'fit-content', height: '56px' }}
    >
      {getDisplayText()}
    </MenuToggle>
  );

  const filterContent = (
    <div ref={contentRef} role="group" aria-label="Latency filter controls">
      <Flex
        data-testid="latency-filter-content"
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsSm' }}
        flexWrap={{ default: 'wrap' }}
        style={{ width: '550px', padding: '16px' }}
      >
        {/* Metric and Percentile on the same line */}
        <FlexItem>
          <Flex spaceItems={{ default: 'spaceItemsMd' }}>
            <FlexItem flex={{ default: 'flex_1' }}>
              <FormGroup label="Metric">
                <Dropdown
                  isOpen={isMetricOpen}
                  onOpenChange={setIsMetricOpen}
                  onSelect={() => setIsMetricOpen(false)}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      data-testid="latency-metric-select"
                      onClick={() => setIsMetricOpen(!isMetricOpen)}
                      isExpanded={isMetricOpen}
                      className="pf-v6-u-w-100"
                    >
                      {localFilter.metric}
                    </MenuToggle>
                  )}
                  shouldFocusToggleOnSelect
                  shouldFocusFirstItemOnOpen
                >
                  <DropdownList data-testid="latency-metric-options">
                    {availableMetrics.map((option) => (
                      <DropdownItem
                        key={option.value}
                        onClick={() =>
                          setLocalFilter((prev) => ({ ...prev, metric: option.value }))
                        }
                        isSelected={localFilter.metric === option.value}
                        data-testid={`latency-metric-option-${option.value}`}
                        description={option.description}
                      >
                        {option.label}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              </FormGroup>
            </FlexItem>

            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <FlexItem flex={{ default: 'flex_1' }}>
                  <FormGroup label="Percentile">
                    <Dropdown
                      isOpen={isPercentileOpen}
                      onOpenChange={setIsPercentileOpen}
                      onSelect={() => setIsPercentileOpen(false)}
                      toggle={(toggleRef) => (
                        <MenuToggle
                          ref={toggleRef}
                          data-testid="latency-percentile-select"
                          onClick={() => setIsPercentileOpen(!isPercentileOpen)}
                          isExpanded={isPercentileOpen}
                          className="pf-v6-u-w-100"
                        >
                          {localFilter.percentile}
                        </MenuToggle>
                      )}
                      shouldFocusToggleOnSelect
                      shouldFocusFirstItemOnOpen
                    >
                      <DropdownList data-testid="latency-percentile-options">
                        {getAvailablePercentiles().map((option) => (
                          <DropdownItem
                            key={option.value}
                            onClick={() =>
                              setLocalFilter((prev) => ({
                                ...prev,
                                percentile: option.value,
                              }))
                            }
                            isSelected={localFilter.percentile === option.value}
                            data-testid={`latency-percentile-option-${option.value}`}
                          >
                            {option.label}
                          </DropdownItem>
                        ))}
                      </DropdownList>
                    </Dropdown>
                  </FormGroup>
                </FlexItem>
                <FlexItem>
                  <Popover
                    bodyContent={
                      <>
                        Select the latency measure used for benchmarking - percentile or mean.
                        <ul style={{ marginTop: '8px' }}>
                          <li>
                            <strong>P90, P95, P99:</strong> The selected percentage of requests must
                            meet the latency threshold.
                          </li>
                          <li>
                            <strong>Mean:</strong> The average latency across all requests.
                          </li>
                        </ul>
                      </>
                    }
                    appendTo={() => document.body}
                  >
                    <Button
                      variant="plain"
                      aria-label="More info for Percentile"
                      className="pf-v6-u-p-xs"
                      icon={<HelpIcon />}
                    />
                  </Popover>
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>
        </FlexItem>

        {/* Slider with value display */}
        <FlexItem>
          <SliderWithInput
            value={clampedValue}
            min={minValue}
            max={maxValue}
            isDisabled={isSliderDisabled}
            onChange={(value) => setLocalFilter({ ...localFilter, value })}
            suffix="ms"
            ariaLabel="Latency value input"
            shouldRound
            showBoundaries={!isSliderDisabled}
            hasTooltipOverThumb={isSliderDisabled}
          />
        </FlexItem>

        {/* Buttons: Apply filter first, then Reset */}
        <FlexItem>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Button
                data-testid="latency-apply-filter"
                variant="primary"
                onClick={handleApplyFilter}
                isDisabled={isSliderDisabled}
              >
                Apply
              </Button>
            </FlexItem>
            <FlexItem>
              <Button data-testid="latency-reset-filter" variant="link" onClick={handleReset}>
                Reset
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
    </div>
  );

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={handleOuterOpenChange}
      onOpenChangeKeys={['Escape']}
      toggle={toggle}
      shouldFocusToggleOnSelect={false}
      popperProps={{
        position: 'left',
        enableFlip: true,
      }}
    >
      {filterContent}
    </Dropdown>
  );
};

export default LatencyFilter;
