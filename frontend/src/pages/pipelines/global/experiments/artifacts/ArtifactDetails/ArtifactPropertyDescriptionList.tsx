import React from 'react';

import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';

import { Value } from '#~/third_party/mlmd';
import { MlmdPropertyDetailsValue } from '#~/pages/pipelines/global/experiments/MlmdPropertyValue';

interface ArtifactPropertyDescriptionListProps {
  testId: string;
  propertiesMap: [string, Value.AsObject][];
}

export const ArtifactPropertyDescriptionList: React.FC<ArtifactPropertyDescriptionListProps> = ({
  propertiesMap,
  testId,
}) => (
  <DescriptionList isHorizontal data-testid={testId}>
    <DescriptionListGroup style={{ alignItems: 'start' }}>
      {propertiesMap.map(([propKey, propValues]) => (
        <React.Fragment key={propKey}>
          <DescriptionListTerm data-testid={`${testId}-${propKey}`}>{propKey}</DescriptionListTerm>
          <DescriptionListDescription>
            <MlmdPropertyDetailsValue values={propValues} />
          </DescriptionListDescription>
        </React.Fragment>
      ))}
    </DescriptionListGroup>
  </DescriptionList>
);
