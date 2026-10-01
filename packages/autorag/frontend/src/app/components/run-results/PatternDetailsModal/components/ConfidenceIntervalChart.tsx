import React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Popover,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type {
  AutoragEvaluationMetric,
  AutoragPatternScoreMetric,
} from '~/app/types/autoragPattern';
import {
  CI_HIGH_HELP,
  CI_INTERVAL_HELP,
  CI_LOW_HELP,
  CI_MEAN_HELP,
  CI_SCORE_HELP,
} from '~/app/utilities/const';
import {
  formatMetricValue,
  groupMetricsByKey,
  metricDomId,
  metricDomSuffix,
  metricKey,
  metricLabel,
  normalizeMetricReference,
} from '~/app/utilities/metricUtils';
import { getMetricDescription } from '~/app/utilities/metricDisplay';
import InlineTooltip from '~/app/components/InlineTooltip';

const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1];
const INNER_TICKS = [0.25, 0.5, 0.75];

const compareMetrics = (left: AutoragEvaluationMetric, right: AutoragEvaluationMetric): number =>
  metricLabel(left).localeCompare(metricLabel(right)) ||
  metricKey(left).localeCompare(metricKey(right));

const DiamondMarker: React.FC<
  { testId?: string; ariaLabel: string } & React.SVGProps<SVGSVGElement>
> = ({ testId, ariaLabel, ...rest }) => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 12 12"
    data-testid={testId}
    tabIndex={0}
    role="img"
    aria-label={ariaLabel}
    {...rest}
  >
    <polygon points="6,0 12,6 6,12 0,6" />
  </svg>
);

const CircleMarker: React.FC<
  { testId?: string; ariaLabel: string } & React.SVGProps<SVGSVGElement>
> = ({ testId, ariaLabel, ...rest }) => (
  <svg
    width={12}
    height={12}
    viewBox="0 0 12 12"
    data-testid={testId}
    tabIndex={0}
    role="img"
    aria-label={ariaLabel}
    {...rest}
  >
    <circle cx={6} cy={6} r={6} />
  </svg>
);

const CIBarWithMarkers: React.FC<{
  score: AutoragPatternScoreMetric;
  testIdPrefix: string;
}> = ({ score, testIdPrefix }) => (
  <div className="autorag-ci-track__bar">
    {score.ci_low != null && (
      <Tooltip content={`CI low: ${formatMetricValue(score.ci_low, 3)}`}>
        <DiamondMarker
          className="autorag-ci-marker m-ci-low"
          style={{ left: `${score.ci_low * 100}%` }}
          testId={`ci-marker-low-${testIdPrefix}`}
          ariaLabel={`CI low: ${formatMetricValue(score.ci_low, 3)}`}
        />
      </Tooltip>
    )}
    {score.mean != null && (
      <Tooltip content={`Mean: ${formatMetricValue(score.mean, 3)}`}>
        <CircleMarker
          className="autorag-ci-marker m-mean"
          style={{ left: `${score.mean * 100}%` }}
          testId={`ci-marker-mean-${testIdPrefix}`}
          ariaLabel={`Mean: ${formatMetricValue(score.mean, 3)}`}
        />
      </Tooltip>
    )}
    {score.ci_high != null && (
      <Tooltip content={`CI high: ${formatMetricValue(score.ci_high, 3)}`}>
        <DiamondMarker
          className="autorag-ci-marker m-ci-high"
          style={{ left: `${score.ci_high * 100}%` }}
          testId={`ci-marker-high-${testIdPrefix}`}
          ariaLabel={`CI high: ${formatMetricValue(score.ci_high, 3)}`}
        />
      </Tooltip>
    )}
  </div>
);

const MetricLabel: React.FC<{ metric: AutoragEvaluationMetric }> = ({ metric }) => {
  const label = metricLabel(metric);
  const description = getMetricDescription(normalizeMetricReference(metric).name);
  return (
    <Content component={ContentVariants.p}>
      {description ? (
        <InlineTooltip
          text={label}
          tooltip={description}
          data-testid={`ci-metric-help-${metricDomSuffix(metric)}`}
        />
      ) : (
        label
      )}
    </Content>
  );
};

const CIScoreTrack: React.FC<{
  metric: AutoragEvaluationMetric;
  score: AutoragPatternScoreMetric;
}> = ({ metric, score }) => (
  <div className="autorag-ci-track" data-testid={metricDomId('ci-track', metric)}>
    <div className="autorag-ci-track__label">
      <MetricLabel metric={metric} />
    </div>
    <CIBarWithMarkers score={score} testIdPrefix={metricDomSuffix(metric)} />
  </div>
);

const AxisTicks: React.FC = () => (
  <div className="autorag-ci-ticks">
    {INNER_TICKS.map((tick) => (
      <div key={tick} className="autorag-ci-tick" style={{ left: `${tick * 100}%` }} />
    ))}
  </div>
);

const AxisLabels: React.FC<{ testId?: string }> = ({ testId }) => (
  <div className="autorag-ci-axis" data-testid={testId}>
    {AXIS_TICKS.map((tick) => (
      <span key={tick}>{tick}</span>
    ))}
  </div>
);

const CIComparisonChart: React.FC<{
  metrics: AutoragEvaluationMetric[];
  primaryScores: AutoragEvaluationMetric[];
  comparisonScores: AutoragEvaluationMetric[];
  primaryLabel: string;
  comparisonLabel: string;
}> = ({ metrics, primaryScores, comparisonScores, primaryLabel, comparisonLabel }) => {
  const columns = [
    { label: primaryLabel, scores: primaryScores, testIdSuffix: 'primary' },
    { label: comparisonLabel, scores: comparisonScores, testIdSuffix: 'comparison' },
  ];

  return (
    <div className="autorag-ci-scores__comparison">
      <div className="autorag-ci-comparison-row autorag-ci-comparison-row--header">
        <div className="autorag-ci-column__header">
          <Content component={ContentVariants.small}>&nbsp;</Content>
        </div>
        {columns.map(({ label, testIdSuffix }) => (
          <div
            key={testIdSuffix}
            className="autorag-ci-column__header"
            data-testid={`ci-column-${testIdSuffix}`}
          >
            <Content component={ContentVariants.small}>{label}</Content>
          </div>
        ))}
      </div>
      {metrics.map((metric) => (
        <div key={metricKey(metric)} className="autorag-ci-comparison-row">
          <div className="autorag-ci-track autorag-ci-comparison-label">
            <MetricLabel metric={metric} />
          </div>
          {columns.map(({ scores, testIdSuffix }) => {
            const scoreGroup = groupMetricsByKey(scores).get(metricKey(metric));
            const score = scoreGroup?.length === 1 ? scoreGroup[0].scores : undefined;
            return (
              <div key={testIdSuffix} className="autorag-ci-comparison-bar">
                <div className={score ? 'autorag-ci-track' : 'autorag-ci-track m-empty'}>
                  {score && (
                    <CIBarWithMarkers
                      score={score}
                      testIdPrefix={`${metricDomSuffix(metric)}-${testIdSuffix}`}
                    />
                  )}
                </div>
                <AxisTicks />
              </div>
            );
          })}
        </div>
      ))}
      <div className="autorag-ci-comparison-row autorag-ci-comparison-row--axis">
        <div />
        <AxisLabels />
        <AxisLabels />
      </div>
    </div>
  );
};

const LegendDiamond: React.FC<{ className: string }> = ({ className }) => (
  <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
    <polygon points="6,0 12,6 6,12 0,6" className={className} />
  </svg>
);

const LegendCircle: React.FC = () => (
  <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
    <circle cx={6} cy={6} r={6} className="m-mean" />
  </svg>
);

const CILegend: React.FC = () => (
  <Flex
    className="autorag-ci-legend"
    gap={{ default: 'gapLg' }}
    alignItems={{ default: 'alignItemsCenter' }}
    data-testid="ci-legend"
  >
    <FlexItem>
      <Content component={ContentVariants.small}>
        <InlineTooltip
          text="95% confidence interval"
          tooltip={CI_INTERVAL_HELP}
          data-testid="ci-legend-interval-help"
        />
      </Content>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendDiamond className="m-ci-low" />
        <Content component={ContentVariants.small}>
          <InlineTooltip text="CI low" tooltip={CI_LOW_HELP} data-testid="ci-legend-low-help" />
        </Content>
      </span>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendCircle />
        <Content component={ContentVariants.small}>
          <InlineTooltip
            text="Mean score"
            tooltip={CI_MEAN_HELP}
            data-testid="ci-legend-mean-help"
          />
        </Content>
      </span>
    </FlexItem>
    <FlexItem>
      <span className="autorag-ci-legend__item">
        <LegendDiamond className="m-ci-high" />
        <Content component={ContentVariants.small}>
          <InlineTooltip text="CI high" tooltip={CI_HIGH_HELP} data-testid="ci-legend-high-help" />
        </Content>
      </span>
    </FlexItem>
  </Flex>
);

function hasData(score: AutoragPatternScoreMetric): boolean {
  return Number.isFinite(score.mean) || score.ci_low != null || score.ci_high != null;
}

function getScoreEntries(scores: AutoragEvaluationMetric[]): AutoragEvaluationMetric[] {
  // eslint-disable-next-line camelcase
  const emptyScore: AutoragPatternScoreMetric = { mean: null, ci_low: null, ci_high: null };
  return Array.from(groupMetricsByKey(scores).values())
    .flatMap((group) => {
      const metric = group[0];
      if (group.length > 1) {
        return group.some((entry) => hasData(entry.scores))
          ? [{ ...metric, scores: emptyScore }]
          : [];
      }
      return hasData(metric.scores) ? [metric] : [];
    })
    .toSorted(compareMetrics);
}

export function hasConfidenceIntervalData(scores: AutoragEvaluationMetric[]): boolean {
  return getScoreEntries(scores).length > 0;
}

type ConfidenceIntervalChartProps = {
  scores: AutoragEvaluationMetric[];
  comparisonScores?: AutoragEvaluationMetric[];
  primaryLabel?: string;
  comparisonLabel?: string;
  'data-testid'?: string;
};

const ConfidenceIntervalChart: React.FC<ConfidenceIntervalChartProps> = ({
  scores,
  comparisonScores,
  primaryLabel,
  comparisonLabel,
  'data-testid': testId = 'ci-scores-chart',
}) => {
  const scoreEntries = getScoreEntries(scores);
  const comparisonEntries = comparisonScores ? getScoreEntries(comparisonScores) : [];

  if (scoreEntries.length === 0 && comparisonEntries.length === 0) {
    return null;
  }

  const isComparison = comparisonScores != null;
  const metrics = isComparison
    ? Array.from(
        [...scoreEntries, ...comparisonEntries]
          .reduce((map, metric) => {
            const key = metricKey(metric);
            if (!map.has(key)) {
              map.set(key, metric);
            }
            return map;
          }, new Map<string, AutoragEvaluationMetric>())
          .values(),
      ).toSorted(compareMetrics)
    : scoreEntries;

  return (
    <div className="autorag-ci-scores" data-testid={testId}>
      <div className="autorag-ci-scores__header">
        <Title headingLevel="h3">Confidence interval (CI) scores</Title>
        <Popover bodyContent={CI_SCORE_HELP} position="top">
          <Button
            variant="plain"
            aria-label="Confidence interval scores info"
            data-testid="ci-scores-info"
            icon={<OutlinedQuestionCircleIcon />}
          />
        </Popover>
      </div>
      <Content component={ContentVariants.p} className="autorag-ci-scores__description">
        {isComparison
          ? 'Each pattern plots mean, CI low, and CI high on its own 0–1 x-axis. Metric labels are shared on the left. Hover the markers for exact values.'
          : 'Each optimization metric is plotted on a shared 0–1 x-axis. Hover the markers on each track for exact CI low, mean, and CI high values.'}
      </Content>
      {isComparison ? (
        <CIComparisonChart
          metrics={metrics}
          primaryScores={scores}
          comparisonScores={comparisonScores}
          primaryLabel={primaryLabel ?? ''}
          comparisonLabel={comparisonLabel ?? ''}
        />
      ) : (
        <>
          <div className="autorag-ci-scores__chart-area">
            <div className="autorag-ci-scores__tracks">
              {scoreEntries.map((metric) => (
                <CIScoreTrack key={metricKey(metric)} metric={metric} score={metric.scores} />
              ))}
            </div>
            <AxisTicks />
          </div>
          <AxisLabels testId="ci-axis" />
        </>
      )}
      <CILegend />
    </div>
  );
};

export default ConfidenceIntervalChart;
