import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Execution } from '#~/third_party/mlmd';
import ExecutionDetailsPropertiesValue from '#~/pages/pipelines/global/experiments/executions/details/ExecutionDetailsPropertiesValue';
import { getMlmdMetadataValue } from '#~/pages/pipelines/global/experiments/executions/utils';

type ExecutionDetailsCustomPropertiesSectionProps = {
  execution: Execution;
};

const ExecutionDetailsCustomPropertiesSection: React.FC<
  ExecutionDetailsCustomPropertiesSectionProps
> = ({ execution }) => {
  const propertiesMap = execution.getCustomPropertiesMap();

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3">Custom properties</Title>
      </StackItem>
      <StackItem>
        {propertiesMap.getEntryList().length === 0 ? (
          'No custom properties'
        ) : (
          <DescriptionList isHorizontal isCompact>
            {propertiesMap.getEntryList().map((p) => (
              <DescriptionListGroup key={p[0]} style={{ alignItems: 'start' }}>
                <DescriptionListTerm>{p[0]}</DescriptionListTerm>
                <DescriptionListDescription>
                  <ExecutionDetailsPropertiesValue
                    value={getMlmdMetadataValue(propertiesMap.get(p[0]))}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        )}
      </StackItem>
    </Stack>
  );
};

export default ExecutionDetailsCustomPropertiesSection;
