import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  Flex,
  FlexItem,
  Gallery,
  Label,
  Title,
} from '@patternfly/react-core';
import {
  CalendarAltIcon,
  ClipboardListIcon,
  OutlinedClockIcon,
  ProjectDiagramIcon,
} from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { evaluationsBaseRoute } from '~/app/routes';
import { useEvaluationJob } from '~/app/hooks/useEvaluationJob';
import {
  formatDate,
  formatDuration,
  getBenchmarkName,
  getBenchmarkResultScore,
  getEvaluationName,
  getResultScore,
} from '~/app/utilities/evaluationUtils';
import BenchmarkResultCard from '~/app/components/BenchmarkResultCard';
import BenchmarkResultDetails from '~/app/components/BenchmarkResultDetails';
import InlineHelpIcon from '~/app/components/InlineHelpIcon';

const DEFAULT_VISIBLE_BENCHMARKS = 4;

const EvaluationResultsPage: React.FC = () => {
  const { namespace, jobId } = useParams<{ namespace: string; jobId: string }>();
  const [job, loaded, error] = useEvaluationJob(namespace, jobId);

  const benchmarkIds = React.useMemo(
    () => job?.benchmarks?.map((b) => b.id) ?? [],
    [job?.benchmarks],
  );

  const [selectedBenchmarkId, setSelectedBenchmarkId] = React.useState<string | null>(null);
  const [showAllBenchmarks, setShowAllBenchmarks] = React.useState(false);

  React.useEffect(() => {
    if (benchmarkIds.length > 0) {
      setSelectedBenchmarkId((prev) =>
        prev === null || !benchmarkIds.includes(prev) ? benchmarkIds[0] : prev,
      );
    } else {
      setSelectedBenchmarkId(null);
    }
    setShowAllBenchmarks(false);
  }, [benchmarkIds]);

  const visibleBenchmarkIds = showAllBenchmarks
    ? benchmarkIds
    : benchmarkIds.slice(0, DEFAULT_VISIBLE_BENCHMARKS);

  const hiddenCount = Math.max(0, benchmarkIds.length - DEFAULT_VISIBLE_BENCHMARKS);

  const evaluationName = job ? getEvaluationName(job) : '';
  const duration = job
    ? formatDuration(job.resource.created_at, job.resource.updated_at)
    : undefined;

  const scoreDisplay = React.useMemo(() => {
    if (!job) {
      return '-';
    }
    if (selectedBenchmarkId && benchmarkIds.length > 1) {
      return getBenchmarkResultScore(job, selectedBenchmarkId);
    }
    return getResultScore(job);
  }, [job, selectedBenchmarkId, benchmarkIds.length]);

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
          <ProjectDiagramIcon
            className="pf-v6-u-mr-xs"
            style={{ color: 'var(--pf-t--global--icon--color--subtle)' }}
          />
          {job.model.name}
        </Content>
      </FlexItem>
      <FlexItem>
        <Content component="small" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
          <ClipboardListIcon
            className="pf-v6-u-mr-xs"
            style={{ color: 'var(--pf-t--global--icon--color--subtle)' }}
          />
          {job.collection?.id
            ? `${job.collection.id} (${job.benchmarks?.length ?? 0} benchmarks)`
            : getBenchmarkName(job)}
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
                <InlineHelpIcon
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
          {benchmarkIds.length > 1 && (
            <div className="pf-v6-u-mb-lg" data-testid="benchmarks-grid">
              <Title headingLevel="h3" className="pf-v6-u-mb-md">
                Benchmarks
              </Title>
              <Gallery hasGutter minWidths={{ default: '250px' }}>
                {visibleBenchmarkIds.map((id) => (
                  <BenchmarkResultCard
                    key={id}
                    benchmarkId={id}
                    job={job}
                    isSelected={selectedBenchmarkId === id}
                    onClick={() => setSelectedBenchmarkId(id)}
                  />
                ))}
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
          {selectedBenchmarkId && (
            <BenchmarkResultDetails benchmarkId={selectedBenchmarkId} job={job} />
          )}
        </div>
      )}
    </ApplicationsPage>
  );
};

export default EvaluationResultsPage;
