/* eslint-disable camelcase */
import * as React from 'react';
import {
  Alert,
  Backdrop,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Divider,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  Popover,
  Skeleton,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon, MagicIcon, TimesIcon } from '@patternfly/react-icons';
import { createPortal } from 'react-dom';
import CopySuiteBenchmarkDetailsOverlay from '~/app/components/CopySuiteBenchmarkDetailsOverlay';
import {
  formatCategory,
  getCategoryColor,
  getMetricDisplayName,
} from '~/app/components/benchmarkUtils';
import { formatThresholdValue } from '~/app/utilities/evaluationUtils';
import { buildFlatBenchmarkByKey } from '~/app/utilities/benchmarkDetailsUtils';
import { MAX_COLLECTION_BENCHMARKS } from '~/app/pages/const';
import type {
  CollectionBenchmark,
  CollectionGenerationResource,
  FlatBenchmark,
  Provider,
} from '~/app/types';

import './CollectionGenerationStep.scss';

const BENCHMARK_LOADING_SKELETON_COUNT = 6;

type CollectionGenerationStepProps = {
  resource?: CollectionGenerationResource;
  isLoading: boolean;
  isStarting: boolean;
  isStopping: boolean;
  isStale: boolean;
  providers: Provider[];
  error?: Error;
  pollError?: Error;
  selectedBenchmarks: CollectionBenchmark[];
  onSelectedBenchmarksChange: (benchmarks: CollectionBenchmark[]) => void;
  onRetry: () => void;
  onRetryPoll: () => void;
  onStop: () => void;
};

type AlternativeBenchmark = {
  benchmark: CollectionBenchmark;
  reason: string;
  reasonHeading: string;
};

const benchmarkKey = (benchmark: Pick<CollectionBenchmark, 'id' | 'provider_id'>): string =>
  `${benchmark.provider_id ?? ''}:${benchmark.id}`;

const getActionLabel = (actionName?: string): string | undefined => {
  const labels: Record<string, string> = {
    guardrails_check: 'Checking the request',
    search_benchmarks: 'Searching the benchmark catalog',
    get_provider_details: 'Loading benchmark details',
    list_collections: 'Comparing existing collections',
    validate_proposal: 'Validating the recommendation',
    calibrate_proposal: 'Calibrating benchmark settings',
    finalize_proposal: 'Preparing the recommendation',
  };
  return actionName ? labels[actionName] : undefined;
};

const getPhaseLabel = (phase?: string): string | undefined => {
  const labels: Record<string, string> = {
    guardrails: 'Checking the request',
    catalog_discovery: 'Searching the benchmark catalog',
    model_generation: 'Building a recommendation',
    validation: 'Checking benchmark coverage',
    finalization: 'Preparing the recommendation',
  };
  return phase ? labels[phase] : undefined;
};

const enrichCollectionBenchmark = (
  benchmark: CollectionBenchmark,
  providers: Provider[],
): CollectionBenchmark => {
  const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
  const catalogBenchmark = provider?.benchmarks?.find((item) => item.id === benchmark.id);
  return {
    ...benchmark,
    ...(benchmark.url || !catalogBenchmark?.url ? {} : { url: catalogBenchmark.url }),
    ...(benchmark.primary_score || !catalogBenchmark?.primary_score
      ? {}
      : {
          primary_score: {
            metric: catalogBenchmark.primary_score.metric,
            lower_is_better: catalogBenchmark.primary_score.lower_is_better,
          },
        }),
    ...(benchmark.pass_criteria || !catalogBenchmark?.pass_criteria
      ? {}
      : { pass_criteria: { threshold: catalogBenchmark.pass_criteria.threshold } }),
  };
};

type OtherBenchmarksDrawerProps = {
  isOpen: boolean;
  alternatives: AlternativeBenchmark[];
  providers: Provider[];
  providerBenchmarks: ReadonlyMap<string, FlatBenchmark>;
  selectionLimitReached: boolean;
  onClose: () => void;
  onAdd: (benchmark: CollectionBenchmark) => void;
};

const OtherBenchmarksDrawer: React.FC<OtherBenchmarksDrawerProps> = ({
  isOpen,
  alternatives,
  providers,
  providerBenchmarks,
  selectionLimitReached,
  onClose,
  onAdd,
}) => {
  const panel = (
    <DrawerPanelContent
      isResizable
      minSize="400px"
      focusTrap={{ enabled: true }}
      data-testid="collection-generation-alternatives-panel"
    >
      <DrawerHead>
        <Title headingLevel="h2">Other benchmarks to review</Title>
        <DrawerActions>
          <DrawerCloseButton
            onClick={onClose}
            data-testid="collection-generation-close-alternatives"
          />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody className="evalhub-collection-generation-drawer__body pf-v6-u-pb-xl">
        <Content component="p" className="pf-v6-u-mb-lg">
          Compare these alternatives with your evaluation goal. Add any that provide useful
          coverage.
        </Content>
        {alternatives.length === 0 ? (
          <Content component="p">There are no other benchmarks to review.</Content>
        ) : (
          alternatives.map(({ benchmark, reason, reasonHeading }, index) => {
            const catalogBenchmark = benchmark.provider_id
              ? providerBenchmarks.get(benchmarkKey(benchmark))
              : undefined;
            const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
            const name = catalogBenchmark?.name ?? benchmark.id;
            const category = catalogBenchmark?.category;

            return (
              <React.Fragment key={benchmarkKey(benchmark)}>
                {index > 0 ? <Divider className="pf-v6-u-my-md" /> : null}
                <Flex
                  direction={{ default: 'column' }}
                  spaceItems={{ default: 'spaceItemsMd' }}
                  data-testid={`collection-generation-alternative-${benchmark.id}`}
                >
                  {category ? (
                    <FlexItem>
                      <Label color={getCategoryColor(category)} isCompact>
                        {formatCategory(category)}
                      </Label>
                    </FlexItem>
                  ) : null}
                  <FlexItem>
                    <Title headingLevel="h3" size="lg">
                      {name}
                    </Title>
                    <Content component="p" className="pf-v6-u-mb-sm">
                      {benchmark.id}
                      {provider ? ` · ${provider.title ?? provider.name}` : ''}
                    </Content>
                    {catalogBenchmark?.description ? (
                      <Content component="p">{catalogBenchmark.description}</Content>
                    ) : null}
                  </FlexItem>
                  <FlexItem>
                    <Content
                      component="h4"
                      className="evalhub-collection-generation-drawer__reason-heading"
                    >
                      {reasonHeading}
                    </Content>
                    <Content component="p">{reason}</Content>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="secondary"
                      isDisabled={selectionLimitReached}
                      onClick={() => onAdd(benchmark)}
                      data-testid={`collection-generation-add-${benchmark.id}`}
                    >
                      Add to collection
                    </Button>
                  </FlexItem>
                </Flex>
              </React.Fragment>
            );
          })
        )}
        {selectionLimitReached ? (
          <Content component="p" className="pf-v6-u-mt-md">
            Remove a benchmark before adding another. Collections can include up to{' '}
            {MAX_COLLECTION_BENCHMARKS} benchmarks.
          </Content>
        ) : null}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  const overlay = (
    <Backdrop
      className={`evalhub-collection-generation-drawer__backdrop${
        isOpen ? ' evalhub-collection-generation-drawer__backdrop--open' : ''
      }`}
      data-testid="collection-generation-alternatives-backdrop"
      aria-hidden={!isOpen}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="evalhub-collection-generation-drawer__host">
        <Drawer
          isExpanded={isOpen}
          isInline={false}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              onClose();
            }
          }}
        >
          <DrawerContent id="collection-generation-alternatives" panelContent={panel} />
        </Drawer>
      </div>
    </Backdrop>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

const CollectionGenerationStep: React.FC<CollectionGenerationStepProps> = ({
  resource,
  isLoading,
  isStarting,
  isStopping,
  isStale,
  providers,
  error,
  pollError,
  selectedBenchmarks,
  onSelectedBenchmarksChange,
  onRetry,
  onRetryPoll,
  onStop,
}) => {
  const [isAlternativesOpen, setIsAlternativesOpen] = React.useState(false);
  const [detailsBenchmark, setDetailsBenchmark] = React.useState<FlatBenchmark>();
  const providerBenchmarks = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);
  const completedResource = resource?.status.state === 'completed' ? resource : undefined;
  const result = completedResource?.result;
  const selectedKeys = React.useMemo(
    () => new Set(selectedBenchmarks.map(benchmarkKey)),
    [selectedBenchmarks],
  );

  const alternatives = React.useMemo<AlternativeBenchmark[]>(() => {
    if (!result) {
      return [];
    }

    const available = new Map<string, AlternativeBenchmark>();
    result.explanation.rejected_benchmarks.forEach((reason) => {
      const benchmark = enrichCollectionBenchmark(
        { id: reason.id, provider_id: reason.provider_id },
        providers,
      );
      if (!selectedKeys.has(benchmarkKey(benchmark))) {
        available.set(benchmarkKey(benchmark), {
          benchmark,
          reason: reason.reason,
          reasonHeading: 'Why it’s an alternative',
        });
      }
    });

    const selectedReasons = new Map(
      result.explanation.selected_benchmarks.map((reason) => [benchmarkKey(reason), reason]),
    );
    result.collection.benchmarks.forEach((benchmark) => {
      const key = benchmarkKey(benchmark);
      const reason = selectedReasons.get(key);
      if (!selectedKeys.has(key) && reason && !available.has(key)) {
        available.set(key, {
          benchmark: enrichCollectionBenchmark(benchmark, providers),
          reason: reason.reason,
          reasonHeading: 'Why this benchmark was recommended',
        });
      }
    });

    return Array.from(available.values());
  }, [providers, result, selectedKeys]);

  const selectedReasonByKey = React.useMemo(() => {
    const reasons = new Map<string, string>();
    result?.explanation.rejected_benchmarks.forEach((reason) => {
      reasons.set(benchmarkKey(reason), reason.reason);
    });
    result?.explanation.selected_benchmarks.forEach((reason) => {
      reasons.set(benchmarkKey(reason), reason.reason);
    });
    return reasons;
  }, [result]);

  const openBenchmarkDetails = (benchmark: CollectionBenchmark, name: string): void => {
    const catalogBenchmark = benchmark.provider_id
      ? providerBenchmarks.get(benchmarkKey(benchmark))
      : undefined;
    const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
    setDetailsBenchmark(
      catalogBenchmark ?? {
        id: benchmark.id,
        name,
        providerId: benchmark.provider_id ?? 'unknown',
        providerName:
          provider?.title ?? provider?.name ?? benchmark.provider_id ?? 'Unknown provider',
      },
    );
  };

  const removeBenchmark = (benchmark: CollectionBenchmark): void => {
    onSelectedBenchmarksChange(
      selectedBenchmarks.filter((item) => benchmarkKey(item) !== benchmarkKey(benchmark)),
    );
  };

  const addBenchmark = (benchmark: CollectionBenchmark): void => {
    if (
      selectedBenchmarks.length >= MAX_COLLECTION_BENCHMARKS ||
      selectedKeys.has(benchmarkKey(benchmark))
    ) {
      return;
    }
    onSelectedBenchmarksChange([...selectedBenchmarks, benchmark]);
  };

  const selectedCards = selectedBenchmarks.map((benchmark) => {
    const key = benchmarkKey(benchmark);
    const catalogBenchmark = benchmark.provider_id ? providerBenchmarks.get(key) : undefined;
    const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
    const name = catalogBenchmark?.name ?? benchmark.id;
    const providerName = provider?.title ?? provider?.name ?? benchmark.provider_id;
    const category = catalogBenchmark?.category;
    const description = catalogBenchmark?.description;
    const primaryScore = benchmark.primary_score ?? catalogBenchmark?.primary_score;
    const passCriteria = benchmark.pass_criteria ?? catalogBenchmark?.pass_criteria;
    const reason = selectedReasonByKey.get(key);

    return (
      <GridItem key={key} sm={12} md={6} lg={4}>
        <Card
          className="evalhub-collection-generation-card"
          data-testid={`collection-generation-selected-${benchmark.id}`}
        >
          <CardHeader>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              className="evalhub-collection-generation-card__header"
            >
              <FlexItem>
                {category ? (
                  <Label color={getCategoryColor(category)} isCompact>
                    {formatCategory(category)}
                  </Label>
                ) : null}
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  aria-label={`Remove ${name}`}
                  onClick={() => removeBenchmark(benchmark)}
                  data-testid={`collection-generation-remove-${benchmark.id}`}
                >
                  <TimesIcon />
                </Button>
              </FlexItem>
            </Flex>
          </CardHeader>
          <CardTitle>
            <Button
              variant="link"
              isInline
              onClick={() => openBenchmarkDetails(benchmark, name)}
              data-testid={`collection-generation-benchmark-name-${benchmark.id}`}
            >
              {name}
            </Button>
            <Content component="p" className="evalhub-collection-generation-card__provider">
              {benchmark.id}
              {providerName ? ` · ${providerName}` : ''}
            </Content>
          </CardTitle>
          <CardBody>
            {description ? <Content component="p">{description}</Content> : null}
            {primaryScore ? (
              <Content
                component="p"
                className={`evalhub-collection-generation-card__setting${
                  passCriteria ? ' pf-v6-u-mb-xs' : ''
                }`}
              >
                <strong>Primary metric:</strong> {getMetricDisplayName(primaryScore.metric)}
              </Content>
            ) : null}
            {passCriteria ? (
              <Content component="p" className="evalhub-collection-generation-card__setting">
                <strong>Recommended threshold:</strong>{' '}
                {formatThresholdValue(passCriteria.threshold, primaryScore?.metric)}
              </Content>
            ) : null}
            {reason ? (
              <Popover headerContent="Why this benchmark?" bodyContent={reason}>
                <Button
                  variant="link"
                  isInline
                  className="pf-v6-u-mt-sm"
                  aria-label={`Why this benchmark? ${name}`}
                  data-testid={`collection-generation-why-${benchmark.id}`}
                >
                  Why this benchmark?
                </Button>
              </Popover>
            ) : null}
          </CardBody>
        </Card>
      </GridItem>
    );
  });

  const isActive = resource?.status.state === 'pending' || resource?.status.state === 'running';
  if (isStarting || isActive || (isLoading && !pollError)) {
    const isPending = !resource || resource.status.state === 'pending';
    const actionLabel =
      resource?.status.state === 'running'
        ? getActionLabel(resource.status.progress?.last_completed_action?.name)
        : undefined;
    const phaseLabel =
      resource?.status.state === 'running'
        ? getPhaseLabel(resource.status.progress?.phase)
        : undefined;

    return (
      <div className="evalhub-goal-collection-page__step" data-testid="benchmark-overview-step">
        <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-md">
          Benchmark overview
        </Title>
        <div className="evalhub-collection-generation-status">
          <MagicIcon aria-hidden className="evalhub-collection-generation-status__icon" />
          <div>
            <Title headingLevel="h3" size="lg">
              {isPending
                ? 'Initializing recommendations'
                : 'AI is comparing benchmarks with your goal'}
            </Title>
            <Content component="p">
              {isPending
                ? 'Preparing to compare your evaluation goal with the benchmark catalog.'
                : 'The AI recommendation is in progress. This may take a moment.'}
            </Content>
            {!isPending && (actionLabel || phaseLabel) ? (
              <Content component="p" data-testid="collection-generation-progress">
                {actionLabel ?? phaseLabel}
                {actionLabel && phaseLabel && actionLabel !== phaseLabel ? ` · ${phaseLabel}` : ''}
              </Content>
            ) : null}
            {pollError ? (
              <Alert
                variant="danger"
                title="Could not refresh recommendation status"
                isInline
                data-testid="collection-generation-poll-error"
              >
                <Content component="p">{pollError.message}</Content>
                <Button
                  variant="secondary"
                  onClick={onRetryPoll}
                  data-testid="collection-generation-retry-poll"
                >
                  Retry loading recommendations
                </Button>
              </Alert>
            ) : null}
            {error ? (
              <Alert
                variant="danger"
                title="Could not stop recommendations"
                isInline
                data-testid="collection-generation-cancel-error"
              >
                <Content component="p">{error.message}</Content>
                <Content component="p">Try again to stop the active recommendation job.</Content>
              </Alert>
            ) : null}
            <Button
              variant="secondary"
              onClick={onStop}
              isDisabled={isStarting || isStopping}
              data-testid="collection-generation-stop"
              className="pf-v6-u-mt-md"
            >
              {isStopping ? 'Stopping…' : 'Stop generating'}
            </Button>
          </div>
        </div>
        <Grid
          hasGutter
          aria-hidden="true"
          className="evalhub-collection-generation-loading-grid"
          data-testid="collection-generation-loading-benchmarks"
        >
          {Array.from({ length: BENCHMARK_LOADING_SKELETON_COUNT }, (_, index) => (
            <GridItem key={index} sm={12} md={6} lg={4}>
              <Card className="evalhub-collection-generation-card" isFullHeight>
                <CardHeader>
                  <Skeleton width="7rem" height="1.5rem" />
                </CardHeader>
                <CardTitle>
                  <Skeleton width="75%" height="1.5rem" />
                  <Content component="p" className="evalhub-collection-generation-card__provider">
                    <Skeleton width="45%" height="1rem" />
                  </Content>
                </CardTitle>
                <CardBody>
                  <div className="evalhub-collection-generation-loading-card__description">
                    <Skeleton width="100%" />
                    <Skeleton width="92%" />
                    <Skeleton width="72%" />
                  </div>
                  <Content
                    component="p"
                    className="evalhub-collection-generation-card__setting pf-v6-u-mb-xs"
                  >
                    <Skeleton width="8rem" />
                    <Skeleton width="4rem" />
                  </Content>
                  <Content component="p" className="evalhub-collection-generation-card__setting">
                    <Skeleton width="9rem" />
                    <Skeleton width="5rem" />
                  </Content>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </div>
    );
  }

  if (!result) {
    const statusError =
      resource?.status.state === 'failed' ? resource.status.error.message : undefined;
    const message = statusError ?? error?.message ?? pollError?.message;
    const title =
      resource?.status.state === 'cancelled'
        ? 'Recommendations were cancelled'
        : 'Could not generate recommendations';
    const isCancelled = resource?.status.state === 'cancelled';

    return (
      <div className="evalhub-goal-collection-page__step" data-testid="benchmark-overview-step">
        <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-md">
          Benchmark overview
        </Title>
        {isCancelled ? (
          <Alert
            variant="info"
            title={title}
            isInline
            data-testid="collection-generation-cancelled"
          >
            <Content component="p">
              Generation stopped. Review your goal and settings, then request new recommendations.
            </Content>
          </Alert>
        ) : message ? (
          <Alert variant="danger" title={title} isInline data-testid="collection-generation-error">
            <Content component="p">{message}</Content>
          </Alert>
        ) : (
          <Alert variant="info" title={title} isInline>
            <Content component="p">Review the goal and settings, then try again.</Content>
          </Alert>
        )}
        {pollError && !isCancelled ? (
          <Button
            variant="secondary"
            onClick={onRetryPoll}
            data-testid="collection-generation-retry-poll"
          >
            Retry loading recommendations
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onRetry}
            isDisabled={isStarting}
            data-testid="collection-generation-retry"
          >
            Recommend benchmarks again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="evalhub-goal-collection-page__step" data-testid="benchmark-overview-step">
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-md">
        Benchmark overview
      </Title>
      <div className="evalhub-collection-generation-status evalhub-collection-generation-status--complete">
        <CheckCircleIcon aria-hidden className="evalhub-collection-generation-status__icon" />
        <div>
          <Title headingLevel="h3" size="lg">
            AI recommendation review complete
          </Title>
          <Content component="p" data-testid="collection-generation-recommended-count">
            {result.collection.benchmarks.length} recommended
          </Content>
        </div>
      </div>
      {isStale ? (
        <Alert
          variant="warning"
          title="Your goal or recommendation settings have changed"
          isInline
          className="pf-v6-u-mb-md"
          data-testid="collection-generation-stale-warning"
        >
          <Content component="p">Generate a fresh recommendation before continuing.</Content>
          <Button
            variant="secondary"
            onClick={onRetry}
            isDisabled={isStarting}
            data-testid="collection-generation-refresh"
          >
            Generate updated recommendations
          </Button>
        </Alert>
      ) : null}
      {error ? (
        <Alert
          variant="danger"
          title="Could not refresh recommendations"
          isInline
          className="pf-v6-u-mb-md"
          data-testid="collection-generation-error"
        >
          <Content component="p">{error.message}</Content>
        </Alert>
      ) : null}
      <Content component="p" className="pf-v6-u-mb-sm">
        <strong>Why these benchmarks:</strong> {result.rationale}
      </Content>
      {alternatives.length > 0 ? (
        <Button
          variant="link"
          isInline
          onClick={() => setIsAlternativesOpen(true)}
          className="pf-v6-u-mb-lg"
          data-testid="collection-generation-review-alternatives"
        >
          Review {alternatives.length} more benchmarks
        </Button>
      ) : null}
      <Flex
        alignItems={{ default: 'alignItemsFlexStart', md: 'alignItemsCenter' }}
        direction={{ default: 'column', md: 'row' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        className="evalhub-collection-generation-selection-heading"
      >
        <FlexItem>
          <Title headingLevel="h3" size="lg">
            Recommended benchmarks and settings
          </Title>
        </FlexItem>
        <FlexItem>
          <Content component="p" data-testid="collection-generation-selection-count">
            <strong>
              Selected benchmarks · {selectedBenchmarks.length} of {MAX_COLLECTION_BENCHMARKS}
            </strong>
          </Content>
        </FlexItem>
      </Flex>
      {selectedBenchmarks.length > MAX_COLLECTION_BENCHMARKS ? (
        <Alert
          variant="warning"
          title={`Select no more than ${MAX_COLLECTION_BENCHMARKS} benchmarks to continue`}
          isInline
          className="pf-v6-u-mb-md"
        >
          The recommendation includes more benchmarks than this collection can contain. Remove some
          from your selection.
        </Alert>
      ) : null}
      {selectedBenchmarks.length > 0 ? (
        <Grid hasGutter data-testid="collection-generation-selected-list">
          {selectedCards}
        </Grid>
      ) : (
        <Alert variant="warning" title="Select at least one benchmark to continue" isInline />
      )}
      <OtherBenchmarksDrawer
        isOpen={isAlternativesOpen}
        alternatives={alternatives}
        providers={providers}
        providerBenchmarks={providerBenchmarks}
        selectionLimitReached={selectedBenchmarks.length >= MAX_COLLECTION_BENCHMARKS}
        onClose={() => setIsAlternativesOpen(false)}
        onAdd={addBenchmark}
      />
      <CopySuiteBenchmarkDetailsOverlay
        benchmark={detailsBenchmark}
        isOpen={!!detailsBenchmark}
        onClose={() => setDetailsBenchmark(undefined)}
        onPrimaryAction={(benchmark) => {
          const selected = selectedBenchmarks.find(
            (item) => item.id === benchmark.id && item.provider_id === benchmark.providerId,
          );
          if (selected) {
            removeBenchmark(selected);
          }
          setDetailsBenchmark(undefined);
        }}
        primaryActionLabel="Remove benchmark"
      />
      {result.explanation.rejected_benchmarks.length > 0 && alternatives.length === 0 ? (
        <Content component="p" className="pf-v6-u-mt-md">
          All alternative benchmarks are already selected.
        </Content>
      ) : null}
    </div>
  );
};

export default CollectionGenerationStep;
/* eslint-enable camelcase */
