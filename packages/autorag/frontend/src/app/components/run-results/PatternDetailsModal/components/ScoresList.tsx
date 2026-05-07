import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Progress,
  ProgressMeasureLocation,
} from '@patternfly/react-core';
import type { AutoragPatternScoreMetric, ScoreType } from '~/app/types/autoragPattern';
import { humanize } from '~/app/utilities/utils';

/* eslint-disable camelcase */
export const scoreTypeLabels: Record<ScoreType, string> = {
  mean: 'Mean',
  ci_high: 'CI High',
  ci_low: 'CI Low',
};
/* eslint-enable camelcase */

export type ScoresListVariant = 'primary' | 'comparison';

const VARIANT_CLASSES: Record<ScoresListVariant, string> = {
  primary: '',
  comparison: 'autorag-scores-list--comparison',
};

const ScoresList: React.FC<{
  scores: Record<string, AutoragPatternScoreMetric | undefined>;
  scoreType: ScoreType;
  /** Visual variant for the progress bar color. Defaults to 'primary' (blue). */
  variant?: ScoresListVariant;
}> = ({ scores, scoreType, variant = 'primary' }) => (
  <DescriptionList isHorizontal className="autorag-scores-list">
    {Object.entries(scores).map(([key, score]) => {
      if (!score) {
        return null;
      }
      const value = score[scoreType];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ci_high/ci_low can be null at runtime
      if (value === null) {
        return (
          <DescriptionListGroup key={key}>
            <DescriptionListTerm>
              {humanize(key)} ({scoreTypeLabels[scoreType]})
            </DescriptionListTerm>
            <DescriptionListDescription>N/A</DescriptionListDescription>
          </DescriptionListGroup>
        );
      }
      return (
        <DescriptionListGroup key={key}>
          <DescriptionListTerm>
            {humanize(key)} ({scoreTypeLabels[scoreType]})
          </DescriptionListTerm>
          <DescriptionListDescription>
            <Progress
              value={value * 100}
              title=""
              label={`${value.toFixed(3)}`}
              measureLocation={ProgressMeasureLocation.outside}
              className={VARIANT_CLASSES[variant]}
              data-testid={`score-progress-${key}`}
            />
          </DescriptionListDescription>
        </DescriptionListGroup>
      );
    })}
  </DescriptionList>
);

export default ScoresList;
