import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  FlexItem,
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';
import { useModularArchContext } from 'mod-arch-core';
import CopySuiteBenchmarkCatalogDrawer from '~/app/components/CopySuiteBenchmarkCatalogDrawer';
import CopySuiteBenchmarkDetailsOverlay from '~/app/components/CopySuiteBenchmarkDetailsOverlay';
import CopySuiteBenchmarkSection from '~/app/components/CopySuiteBenchmarkSection';
import BenchmarkWeightsModal from '~/app/components/BenchmarkWeightsModal';
import type { WeightSegment } from '~/app/components/WeightDistributionBar';
import {
  getBenchmarkKey,
  MAX_BENCHMARKS,
  type CopySuiteBenchmark,
} from '~/app/pages/useCopySuiteForm';
import type { CopySuiteFormValues } from '~/app/schemas/copySuite.schema';
import type { FlatBenchmark, Provider } from '~/app/types';
import {
  buildFlatBenchmarkByKey,
  toggleBenchmarkSelectionKey,
} from '~/app/utilities/benchmarkDetailsUtils';
import { getEvalHubScrollContainer } from '~/app/utilities/scrollContainer';

import './CopySuiteBenchmarksStep.scss';

type CopySuiteBenchmarksStepProps = {
  benchmarks: CopySuiteBenchmark[];
  selectedBenchmarkKeys: string[];
  providers: Provider[];
  showWeightEdit: boolean;
  weightSegments: WeightSegment[];
  minWeightPercent: number;
  isValid: boolean;
  isSubmitting: boolean;
  isInteractionDisabled?: boolean;
  onUpdateBenchmark: (index: number, field: keyof CopySuiteBenchmark, value: unknown) => void;
  onApplyBenchmarkSelection: (selectedKeys: string[]) => void;
  onWeightsChange: (weights: number[]) => void;
  onSaveAndRun: () => void;
  onSaveOnly: () => void;
  onBack: () => void;
  primaryActionLabel?: string;
  primaryActionTestId?: string;
  secondaryActionLabel?: string;
  showSecondaryAction?: boolean;
  onCancel: () => void;
};

const CopySuiteBenchmarksStep: React.FC<CopySuiteBenchmarksStepProps> = ({
  benchmarks,
  selectedBenchmarkKeys,
  providers,
  showWeightEdit,
  weightSegments,
  minWeightPercent,
  isValid,
  isSubmitting,
  isInteractionDisabled = false,
  onUpdateBenchmark,
  onApplyBenchmarkSelection,
  onWeightsChange,
  onSaveAndRun,
  onSaveOnly,
  onBack,
  primaryActionLabel = 'Save and run',
  primaryActionTestId = 'copy-suite-save-and-run',
  secondaryActionLabel = 'Add to my benchmark suites',
  showSecondaryAction = true,
  onCancel,
}) => {
  const { config } = useModularArchContext();
  const {
    formState: { errors },
  } = useFormContext<CopySuiteFormValues>();
  const [isCatalogOpen, setIsCatalogOpen] = React.useState(false);
  const [catalogDraftKeys, setCatalogDraftKeys] = React.useState<string[]>([]);
  const [detailsBenchmarkKey, setDetailsBenchmarkKey] = React.useState<string | undefined>();
  const [isWeightsModalOpen, setIsWeightsModalOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    if (isInteractionDisabled) {
      setIsCatalogOpen(false);
      setDetailsBenchmarkKey(undefined);
      setIsWeightsModalOpen(false);
    }
  }, [isInteractionDisabled]);

  const getScrollableElement = React.useCallback(
    () => getEvalHubScrollContainer(config.deploymentMode),
    [config.deploymentMode],
  );

  const flatBenchmarkByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);

  const detailsBenchmark = detailsBenchmarkKey
    ? flatBenchmarkByKey.get(detailsBenchmarkKey)
    : undefined;
  const hasBenchmarks = benchmarks.length > 0;

  const activeSelectionKeys = isCatalogOpen ? catalogDraftKeys : selectedBenchmarkKeys;

  const isDetailsBenchmarkSelected = detailsBenchmarkKey
    ? activeSelectionKeys.includes(detailsBenchmarkKey)
    : false;

  const openCatalog = React.useCallback(() => {
    if (isInteractionDisabled) {
      return;
    }
    setCatalogDraftKeys(selectedBenchmarkKeys);
    setIsCatalogOpen(true);
  }, [isInteractionDisabled, selectedBenchmarkKeys]);

  const handleDetailsPrimaryAction = React.useCallback(
    (benchmark: FlatBenchmark) => {
      if (isInteractionDisabled) {
        return;
      }
      if (isCatalogOpen) {
        setCatalogDraftKeys((prev) =>
          toggleBenchmarkSelectionKey(prev, getBenchmarkKey(benchmark), MAX_BENCHMARKS),
        );
      }
      setDetailsBenchmarkKey(undefined);
    },
    [isCatalogOpen, isInteractionDisabled],
  );

  const closeCatalog = React.useCallback(() => {
    setIsCatalogOpen(false);
    setDetailsBenchmarkKey(undefined);
  }, []);

  return (
    <div id="copy-suite-step-content-benchmarks" data-testid="copy-suite-step-benchmarks">
      <fieldset
        disabled={isInteractionDisabled}
        className="evalhub-copy-suite-benchmarks-step__fields"
        aria-busy={isInteractionDisabled}
        onClickCapture={
          isInteractionDisabled
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : undefined
        }
        onKeyDownCapture={
          isInteractionDisabled
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : undefined
        }
      >
        <PageHeader onOpenCatalog={openCatalog} hasBenchmarks={hasBenchmarks} />

        {hasBenchmarks ? (
          <Sidebar hasGutter className="evalhub-copy-suite-benchmarks-step__layout">
            <SidebarPanel
              variant="sticky"
              className="pf-v6-u-display-none pf-v6-u-display-block-on-lg evalhub-copy-suite-benchmarks-step__nav"
            >
              <JumpLinks
                key={isInteractionDisabled ? 'locked' : 'interactive'}
                isVertical
                label="Jump to benchmarks"
                scrollableRef={getScrollableElement}
                offset={16}
              >
                {benchmarks.map((benchmark, index) => {
                  const key = `${benchmark.id}-${index}`;
                  const content = (
                    <span
                      className="evalhub-copy-suite-benchmarks-step__jump-link-text"
                      title={benchmark.name}
                    >
                      {benchmark.name}
                    </span>
                  );

                  return isInteractionDisabled ? (
                    <li
                      key={key}
                      className="pf-v6-c-jump-links__item"
                      data-testid={`benchmark-jump-link-${index}`}
                    >
                      <span className="evalhub-copy-suite-benchmarks-step__jump-link-disabled">
                        {content}
                      </span>
                    </li>
                  ) : (
                    <JumpLinksItem
                      key={key}
                      href={`#benchmark-section-${index}`}
                      data-testid={`benchmark-jump-link-${index}`}
                    >
                      {content}
                    </JumpLinksItem>
                  );
                })}
              </JumpLinks>
            </SidebarPanel>
            <SidebarContent>
              <div
                className="evalhub-copy-suite-benchmarks-step__sections"
                data-testid="copy-suite-benchmark-sections"
              >
                {benchmarks.map((benchmark, index) => (
                  <CopySuiteBenchmarkSection
                    key={`${benchmark.id}-${index}`}
                    benchmark={benchmark}
                    index={index}
                    showWeightEdit={showWeightEdit}
                    weightPercentage={weightSegments[index]?.percentage ?? 0}
                    additionalParametersError={
                      errors.benchmarks?.[index]?.additionalParameters?.message
                    }
                    isInteractionDisabled={isInteractionDisabled}
                    onUpdate={(updatedIndex, field, value) => {
                      if (!isInteractionDisabled) {
                        onUpdateBenchmark(updatedIndex, field, value);
                      }
                    }}
                    onEditWeights={() => {
                      if (!isInteractionDisabled) {
                        setIsWeightsModalOpen(true);
                      }
                    }}
                    onOpenDetails={(benchmarkKey) => {
                      if (!isInteractionDisabled) {
                        setDetailsBenchmarkKey(benchmarkKey);
                      }
                    }}
                  />
                ))}
              </div>
            </SidebarContent>
          </Sidebar>
        ) : (
          <EmptyBenchmarksState onOpenCatalog={openCatalog} />
        )}

        <div
          id="copy-suite-actions"
          className="evalhub-copy-suite-page__footer"
          data-testid="copy-suite-actions"
        >
          <Button
            variant="secondary"
            data-testid="copy-suite-back-step-2"
            onClick={onBack}
            isDisabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            variant="primary"
            data-testid={primaryActionTestId}
            onClick={onSaveAndRun}
            isDisabled={!isValid || isSubmitting}
            isLoading={isSubmitting}
          >
            {primaryActionLabel}
          </Button>
          {showSecondaryAction ? (
            <Button
              variant="secondary"
              data-testid="copy-suite-save-only"
              onClick={onSaveOnly}
              isDisabled={!isValid || isSubmitting}
            >
              {secondaryActionLabel}
            </Button>
          ) : null}
          <Button
            variant="link"
            data-testid="copy-suite-cancel-step-2"
            onClick={onCancel}
            isDisabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </fieldset>

      {isCatalogOpen && !isInteractionDisabled ? (
        <CopySuiteBenchmarkCatalogDrawer
          providers={providers}
          selectedBenchmarkKeys={catalogDraftKeys}
          onSelectionChange={setCatalogDraftKeys}
          onSave={onApplyBenchmarkSelection}
          onClose={closeCatalog}
          detailsBenchmarkKey={detailsBenchmarkKey}
          onOpenDetails={setDetailsBenchmarkKey}
        />
      ) : null}

      {detailsBenchmarkKey && !isInteractionDisabled ? (
        <CopySuiteBenchmarkDetailsOverlay
          benchmark={detailsBenchmark}
          onClose={() => setDetailsBenchmarkKey(undefined)}
          onPrimaryAction={handleDetailsPrimaryAction}
          primaryActionLabel={isDetailsBenchmarkSelected ? 'Selected' : 'Select benchmark'}
        />
      ) : null}

      {isWeightsModalOpen && showWeightEdit && !isInteractionDisabled ? (
        <BenchmarkWeightsModal
          segments={weightSegments}
          minWeightPercent={minWeightPercent}
          onSave={onWeightsChange}
          onClose={() => setIsWeightsModalOpen(false)}
        />
      ) : null}
    </div>
  );
};

type PageHeaderProps = {
  onOpenCatalog: () => void;
  hasBenchmarks: boolean;
};

const PageHeader: React.FC<PageHeaderProps> = ({ onOpenCatalog, hasBenchmarks }) => (
  <Flex
    alignItems={{ default: 'alignItemsFlexStart' }}
    justifyContent={{ default: 'justifyContentSpaceBetween' }}
    className="evalhub-copy-suite-benchmarks-step__header"
  >
    <FlexItem>
      <Content component="p" data-testid="copy-suite-benchmarks-description">
        Choose the primary metric, number of samples, number of few-shot examples, and threshold
        used to calculate the result for each benchmark.
      </Content>
    </FlexItem>
    {hasBenchmarks ? (
      <FlexItem>
        <Button
          variant="primary"
          id="copy-suite-add-benchmarks-btn"
          data-testid="copy-suite-add-benchmarks-btn"
          onClick={onOpenCatalog}
        >
          Add remove benchmarks
        </Button>
      </FlexItem>
    ) : null}
  </Flex>
);

type EmptyBenchmarksStateProps = {
  onOpenCatalog: () => void;
};

const EmptyBenchmarksState: React.FC<EmptyBenchmarksStateProps> = ({ onOpenCatalog }) => (
  <EmptyState
    data-testid="copy-suite-benchmarks-empty-state"
    headingLevel="h3"
    titleText="No benchmarks added"
  >
    <EmptyStateBody>No benchmarks have been added to this suite.</EmptyStateBody>
    <EmptyStateFooter>
      <EmptyStateActions>
        <Button
          variant="primary"
          data-testid="copy-suite-empty-add-benchmarks-btn"
          onClick={onOpenCatalog}
        >
          Add benchmarks
        </Button>
      </EmptyStateActions>
    </EmptyStateFooter>
  </EmptyState>
);

export default CopySuiteBenchmarksStep;
