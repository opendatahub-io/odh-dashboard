import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core';
import type { TabContentProps } from '../tabConfig';

const ModelInformationTab: React.FC<TabContentProps> = ({ artifact }) => {
  const { context, created_at: createdAt } = artifact;

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-md">
        Experiment parameters
      </Title>
      <DescriptionList isHorizontal>
        <DescriptionListGroup>
          <DescriptionListTerm>Prediction column</DescriptionListTerm>
          <DescriptionListDescription>{context.label_column}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Algorithm</DescriptionListTerm>
          <DescriptionListDescription>{artifact.display_name}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Evaluation metric</DescriptionListTerm>
          <DescriptionListDescription>
            {typeof context.model_config.eval_metric === 'string'
              ? context.model_config.eval_metric
              : ''}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Created on</DescriptionListTerm>
          <DescriptionListDescription>
            {new Date(createdAt).toLocaleString()}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};

export default ModelInformationTab;
