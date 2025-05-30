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

type ExecutionDetailsPropertiesSectionProps = {
  execution: Execution;
};

const ExecutionDetailsPropertiesSection: React.FC<ExecutionDetailsPropertiesSectionProps> = ({
  execution,
}) => {
  const propertiesMap = execution.getPropertiesMap();
  const properties = propertiesMap
    .getEntryList()
    // From Kubeflow UI code - "TODO: __ALL_META__ is something of a hack, is redundant, and can be ignore"
    .filter((k) => k[0] !== '__ALL_META__');

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3">Properties</Title>
      </StackItem>
      <StackItem>
        {properties.length === 0 ? (
          'No properties'
        ) : (
          <DescriptionList isHorizontal isCompact>
            {propertiesMap.getEntryList().map((p) => (
              <DescriptionListGroup key={p[0]}>
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

export default ExecutionDetailsPropertiesSection;
