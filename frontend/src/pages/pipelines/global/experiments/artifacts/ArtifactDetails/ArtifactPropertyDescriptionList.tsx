import React from 'react';

import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';

import { Value } from '~/third_party/mlmd';
import { NoValue } from '~/components/NoValue';
import { ExecutionDetailsPropertiesValueCode } from '~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsPropertiesValue';

interface ArtifactPropertyDescriptionListProps {
  testId?: string;
  propertiesMap: [string, Value.AsObject][];
}

export const ArtifactPropertyDescriptionList: React.FC<ArtifactPropertyDescriptionListProps> = ({
  propertiesMap,
  testId,
}) => {
  const getPropertyValue = React.useCallback((property: Value.AsObject): React.ReactNode => {
    let propValue: React.ReactNode =
      property.stringValue || property.intValue || property.doubleValue || property.boolValue || '';

    if (property.structValue || property.protoValue) {
      propValue = (
        <ExecutionDetailsPropertiesValueCode
          code={JSON.stringify(property.structValue || property.protoValue, null, 2)}
        />
      );
    }

    return propValue;
  }, []);

  return (
    <DescriptionList isHorizontal data-testid={testId}>
      <DescriptionListGroup>
        {propertiesMap.map(([propKey, propValue]) => {
          const value = getPropertyValue(propValue);

          return (
            <React.Fragment key={propKey}>
              <DescriptionListTerm>{propKey}</DescriptionListTerm>
              <DescriptionListDescription>
                {!value && value !== 0 ? <NoValue /> : value}
              </DescriptionListDescription>
            </React.Fragment>
          );
        })}
      </DescriptionListGroup>
    </DescriptionList>
  );
};
