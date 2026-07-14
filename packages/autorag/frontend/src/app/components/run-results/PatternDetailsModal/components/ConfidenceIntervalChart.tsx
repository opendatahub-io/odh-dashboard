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
import type { AutoragPatternScores } from '~/app/types/autoragPattern';
import { humanize } from '~/app/utilities/utils';

const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1];

const DiamondMarker: React.FC<{
  className: string;
  style?: React.CSSProperties;
  testId?: string;
}> = ({ className, style, testId }) => (
  <svg
    width={10}
    height={10}
    viewBox="0 0 10 10"
    className={className}
    style={style}
    data-testid={testId}
    tabIndex={0}
    aria-hidden
  >
    <polygon points="5,0 10,5 5,10 0,5" />
  </svg>
);

const CircleMarker: React.FC<{
  className: string;
  style?: React.CSSProperties;
  testId?: string;
}> = ({ className, style, testId }) => (
  <svg
    width={10}
    height={10}
    viewBox="0 0 10 10"
    className={className}
    style={style}
    data-testid={testId}
    tabIndex={0}
    aria-hidden
  >
    <circle cx={5} cy={5} r={5} />
  </svg>
);

const CIScoreTrack: React.FC<{
  metricKey: string;
  score: { mean: number; ci_low: number | null; ci_high: number | null };
}> = ({ metricKey, score }) => (
  <div className="autorag-ci-track" data-testid={`ci-track-${metricKey}`}>
    <div className="autorag-ci-track__label">
      <Content component={ContentVariants.p}>{humanize(metricKey)}</Content>
    </div>
    <div className="autorag-ci-track__bar">
      {score.ci_low != null && (
        <Tooltip content={`CI low: ${score.ci_low.toFixed(3)}`}>
          <DiamondMarker
            className="autorag-ci-marker autorag-ci-marker--ci-low"
            style={{ left: `${score.ci_low * 100}%` }}
            testId={`ci-marker-low-${metricKey}`}
          />
        </Tooltip>
      )}
      <Tooltip content={`Mean: ${score.mean.toFixed(3)}`}>
        <CircleMarker
          className="autorag-ci-marker autorag-ci-marker--mean"
          style={{ left: `${score.mean * 100}%` }}
          testId={`ci-marker-mean-${metricKey}`}
        />
      </Tooltip>
      {score.ci_high != null && (
        <Tooltip content={`CI high: ${score.ci_high.toFixed(3)}`}>
          <DiamondMarker
            className="autorag-ci-marker autorag-ci-marker--ci-high"
            style={{ left: `${score.ci_high * 100}%` }}
            testId={`ci-marker-high-${metricKey}`}
          />
        </Tooltip>
      )}
    </div>
  </div>
);

const LegendDiamond: React.FC<{ className: string }> = ({ className }) => (
  <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
    <polygon points="5,0 10,5 5,10 0,5" className={className} />
  </svg>
);

const LegendCircle: React.FC = () => (
  <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
    <circle cx={5} cy={5} r={5} className="autorag-ci-marker--mean" />
  </svg>
);

const ConfidenceIntervalChart: React.FC<{
  scores: AutoragPatternScores;
  'data-testid'?: string;
}> = ({ scores, 'data-testid': testId = 'ci-scores-chart' }) => {
  const scoreEntries = Object.entries(scores).filter(
    (entry): entry is [string, { mean: number; ci_low: number | null; ci_high: number | null }] =>
      entry[1] != null,
  );

  if (scoreEntries.length === 0) {
    return null;
  }

  return (
    <div className="autorag-ci-scores" data-testid={testId}>
      <div className="autorag-ci-scores__header">
        <Title headingLevel="h3">Confidence interval (CI) scores</Title>
        <Popover
          bodyContent="Confidence interval scores show the statistical range of each evaluation metric. The CI low and CI high markers represent the 95% confidence interval bounds around the mean score."
          position="top"
        >
          <Button
            variant="plain"
            aria-label="Confidence interval scores info"
            icon={<OutlinedQuestionCircleIcon />}
          />
        </Popover>
      </div>
      <Content component={ContentVariants.p} className="autorag-ci-scores__description">
        Each optimization metric is plotted on a shared 0–1 x-axis. Hover the markers on each track
        for exact CI low, mean, and CI high values.
      </Content>
      <div className="autorag-ci-scores__chart-area">
        <div className="autorag-ci-scores__tracks">
          {scoreEntries.map(([key, score]) => (
            <CIScoreTrack key={key} metricKey={key} score={score} />
          ))}
        </div>
        <div className="autorag-ci-ticks">
          {AXIS_TICKS.map((tick) => (
            <div key={tick} className="autorag-ci-tick" style={{ left: `${tick * 100}%` }} />
          ))}
        </div>
      </div>
      <div className="autorag-ci-axis" data-testid="ci-axis">
        {AXIS_TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <Flex
        className="autorag-ci-legend"
        gap={{ default: 'gapLg' }}
        alignItems={{ default: 'alignItemsCenter' }}
        data-testid="ci-legend"
      >
        <FlexItem>
          <Content component={ContentVariants.small}>95% confidence interval</Content>
        </FlexItem>
        <FlexItem>
          <span className="autorag-ci-legend__item">
            <LegendDiamond className="autorag-ci-marker--ci-low" />
            <Content component={ContentVariants.small}>CI low</Content>
          </span>
        </FlexItem>
        <FlexItem>
          <span className="autorag-ci-legend__item">
            <LegendDiamond className="autorag-ci-marker--ci-high" />
            <Content component={ContentVariants.small}>CI high</Content>
          </span>
        </FlexItem>
        <FlexItem>
          <span className="autorag-ci-legend__item">
            <LegendCircle />
            <Content component={ContentVariants.small}>Mean score</Content>
          </span>
        </FlexItem>
      </Flex>
    </div>
  );
};

export default ConfidenceIntervalChart;
