import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Content,
  Flex,
  FlexItem,
  Gallery,
  Label,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { CalendarAltIcon, OutlinedClockIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import { loadRemote } from '@module-federation/runtime';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { DeploymentMode, useModularArchContext } from 'mod-arch-core';
import { evaluationsBaseRoute } from '~/app/routes';
import { useEvaluationJob } from '~/app/hooks/useEvaluationJob';
import { useCollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import useDarkMode from '~/app/hooks/useDarkMode';
import aiModelIconDark from '~/app/bgimages/ai-model-white.svg';
import aiModelIconLight from '~/app/bgimages/ai-model.svg';
import paperStackIconDark from '~/app/bgimages/paper-stack-lined-white.svg';
import paperStackIconLight from '~/app/bgimages/paper-stack-lined-black.svg';
import {
  formatDate,
  formatDuration,
  getBenchmarkName,
  getEvaluationName,
  getJobBenchmarks,
  getResultScore,
} from '~/app/utilities/evaluationUtils';
import BenchmarkResultCard from '~/app/components/BenchmarkResultCard';
import BenchmarkResultDetails from '~/app/components/BenchmarkResultDetails';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

interface MlflowRunTabsProps {
  experimentId: string;
  runUuid: string;
  workspace?: string;
}

const MlflowRunTabs = React.lazy(() =>
  loadRemote<{ default: React.ComponentType<MlflowRunTabsProps> }>(
    'mlflowEmbedded/MlflowRunTabsWrapper',
  )
    .then((mod) => mod ?? { default: () => null })
    .catch(() => ({ default: () => null })),
);

const DEFAULT_VISIBLE_BENCHMARKS = 4;

const EvaluationResultsPage: React.FC = () => {
  const { namespace, jobId } = useParams<{ namespace: string; jobId: string }>();
  const [job, loaded, error] = useEvaluationJob(namespace, jobId);

  const {
    config: { deploymentMode },
  } = useModularArchContext();

  const benchmarks = React.useMemo(() => (job ? getJobBenchmarks(job) : []), [job]);

  // Composite key = "id:benchmark_index" when index is present, else "id:listIndex".
  // Guarantees uniqueness even when the same benchmark id appears multiple times.
  const benchmarkKeys = React.useMemo(
    () => benchmarks.map((b, i) => `${b.id}:${b.benchmark_index ?? i}`),
    [benchmarks],
  );

  const isDarkMode = useDarkMode();
  const { collectionNameMap } = useCollectionNameMap();
  const [selectedBenchmarkKey, setSelectedBenchmarkKey] = React.useState<string | null>(null);
  const [showAllBenchmarks, setShowAllBenchmarks] = React.useState(false);

  React.useEffect(() => {
    if (benchmarkKeys.length > 0) {
      setSelectedBenchmarkKey((prev) =>
        prev === null || !benchmarkKeys.includes(prev) ? benchmarkKeys[0] : prev,
      );
    } else {
      setSelectedBenchmarkKey(null);
    }
    setShowAllBenchmarks(false);
  }, [benchmarkKeys]);

  const visibleBenchmarks = showAllBenchmarks
    ? benchmarks
    : benchmarks.slice(0, DEFAULT_VISIBLE_BENCHMARKS);

  const hiddenCount = Math.max(0, benchmarks.length - DEFAULT_VISIBLE_BENCHMARKS);

  const evaluationName = job ? getEvaluationName(job) : '';
  const duration = job
    ? formatDuration(job.resource.created_at, job.resource.updated_at)
    : undefined;

  // Resolve the selected benchmark object from the composite key.
  const selectedBenchmark = React.useMemo(() => {
    if (!selectedBenchmarkKey) {
      return undefined;
    }
    const idx = benchmarkKeys.indexOf(selectedBenchmarkKey);
    return idx >= 0 ? benchmarks[idx] : undefined;
  }, [selectedBenchmarkKey, benchmarkKeys, benchmarks]);

  const scoreDisplay = React.useMemo(() => {
    if (!job) {
      return '-';
    }
    return getResultScore(job);
  }, [job]);

  const mlflowExperimentId = job?.resource.mlflow_experiment_id;
  const mlflowRunId = React.useMemo(() => {
    if (!selectedBenchmark || !job?.results.benchmarks) {
      return undefined;
    }
    return job.results.benchmarks.find(
      (b) =>
        b.id === selectedBenchmark.id &&
        (selectedBenchmark.benchmark_index === undefined ||
          b.benchmark_index === selectedBenchmark.benchmark_index),
    )?.mlflow_run_id;
  }, [selectedBenchmark, job?.results.benchmarks]);

  const mlflowRunTabsKey = React.useMemo(() => {
    if (!mlflowExperimentId || !mlflowRunId || !selectedBenchmarkKey) {
      return undefined;
    }
    return `${namespace ?? ''}:${mlflowExperimentId}:${selectedBenchmarkKey}:${mlflowRunId}`;
  }, [namespace, mlflowExperimentId, mlflowRunId, selectedBenchmarkKey]);

  const metadataRow = job ? (
    <Flex
      gap={{ default: 'gapLg' }}
      alignItems={{ default: 'alignItemsCenter' }}
      data-testid="evaluation-metadata"
    >
      {job.resource.created_at && (
        <FlexItem>
          <Content component="small" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
            <CalendarAltIcon
              className="pf-v6-u-mr-xs"
              style={{ color: 'var(--pf-t--global--icon--color--subtle)' }}
            />
            {formatDate(job.resource.created_at)}
          </Content>
        </FlexItem>
      )}
      <FlexItem>
        <Content component="small" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
          <img
            src={isDarkMode ? aiModelIconDark : aiModelIconLight}
            alt=""
            aria-hidden="true"
            className="pf-v6-u-mr-xs"
            style={{ width: '1em', height: '1em', verticalAlign: '-0.125em' }}
          />
          {job.model.name}
        </Content>
      </FlexItem>
      <FlexItem>
        <Content component="small" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
          <img
            src={isDarkMode ? paperStackIconDark : paperStackIconLight}
            alt=""
            aria-hidden="true"
            className="pf-v6-u-mr-xs"
            style={{ width: '1em', height: '1em', verticalAlign: '-0.125em' }}
          />
          {getBenchmarkName(job, collectionNameMap)}
        </Content>
      </FlexItem>
      {duration && (
        <FlexItem>
          <Content component="small" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
            <OutlinedClockIcon
              className="pf-v6-u-mr-xs"
              style={{ color: 'var(--pf-t--global--icon--color--subtle)' }}
            />
            {duration}
          </Content>
        </FlexItem>
      )}
    </Flex>
  ) : undefined;

  return (
    <ApplicationsPage
      title={
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          data-testid="evaluation-results-title"
        >
          {evaluationName}
          {job?.tags?.map((tag) => (
            <Label key={tag} color="yellow">
              {tag}
            </Label>
          ))}
        </span>
      }
      subtext={metadataRow}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
          />
          <BreadcrumbItem isActive>{evaluationName}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      loadError={error}
      empty={!job}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      {job && (
        <div data-testid="evaluation-results-content">
          {/* Evaluation score */}
          <div className="pf-v6-u-mb-lg" data-testid="evaluation-score-section">
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              <FlexItem>
                <Content component="h3">Evaluation score</Content>
              </FlexItem>
              <FlexItem>
                <LabelHelpPopover
                  ariaLabel="About evaluation score"
                  content="The overall score aggregated across all benchmarks in this evaluation run."
                />
              </FlexItem>
            </Flex>
            <Title headingLevel="h2" size="4xl" data-testid="evaluation-score-value">
              {scoreDisplay}
            </Title>
          </div>

          {/* Benchmark cards grid (shown whenever there are multiple benchmarks) */}
          {benchmarks.length > 1 && (
            <div className="pf-v6-u-mb-lg" data-testid="benchmarks-grid">
              <Title headingLevel="h3" className="pf-v6-u-mb-md">
                Benchmarks
              </Title>
              <Gallery hasGutter minWidths={{ default: '250px' }}>
                {visibleBenchmarks.map((benchmark, i) => {
                  const cardKey = benchmarkKeys[i];
                  return (
                    <BenchmarkResultCard
                      key={cardKey}
                      benchmarkId={benchmark.id}
                      benchmarkIndex={benchmark.benchmark_index}
                      job={job}
                      isSelected={selectedBenchmarkKey === cardKey}
                      onClick={() => {
                        setSelectedBenchmarkKey(cardKey);
                        fireMiscTrackingEvent(EVAL_HUB_EVENTS.RESULT_BENCHMARK_CARD_SELECTED, {
                          benchmarkId: benchmark.id,
                          evaluationName,
                          collectionName: job.collection?.id,
                        });
                      }}
                    />
                  );
                })}
              </Gallery>
              {!showAllBenchmarks && hiddenCount > 0 && (
                <Button
                  variant="link"
                  className="pf-v6-u-mt-sm"
                  onClick={() => setShowAllBenchmarks(true)}
                  data-testid="view-more-benchmarks"
                >
                  View more ({hiddenCount})
                </Button>
              )}
            </div>
          )}

          {/* Selected benchmark summary (primary metric + threshold) */}
          {selectedBenchmark && (
            <BenchmarkResultDetails
              benchmarkId={selectedBenchmark.id}
              benchmarkIndex={selectedBenchmark.benchmark_index ?? 0}
              job={job}
            />
          )}

          {/* MLflow run tabs for the selected benchmark */}
          {deploymentMode === DeploymentMode.Federated && mlflowExperimentId && mlflowRunId && (
            <div className="pf-v6-u-mt-lg" data-testid="mlflow-run-tabs-section">
              <React.Suspense
                fallback={
                  <Bullseye>
                    <Spinner />
                  </Bullseye>
                }
              >
                <MlflowRunTabs
                  key={mlflowRunTabsKey}
                  experimentId={mlflowExperimentId}
                  runUuid={mlflowRunId}
                  workspace={namespace}
                />
              </React.Suspense>
            </div>
          )}
        </div>
      )}
    </ApplicationsPage>
  );
};

export default EvaluationResultsPage;
