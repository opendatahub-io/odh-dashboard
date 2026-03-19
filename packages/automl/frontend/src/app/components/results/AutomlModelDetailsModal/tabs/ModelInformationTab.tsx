import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core';
import type { TabContentProps } from '~/app/components/results/AutomlModelDetailsModal/tabConfig';

const ModelInformationTab: React.FC<TabContentProps> = ({ model, createdAt }) => {
  const { context } = model;

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-lg">
        Experiment parameters
      </Title>
      <DescriptionList isHorizontal isCompact className="automl-model-info-list">
        <DescriptionListGroup>
          <DescriptionListTerm>Prediction column</DescriptionListTerm>
          <DescriptionListDescription>{context.label_column}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Algorithm</DescriptionListTerm>
          <DescriptionListDescription>{model.display_name}</DescriptionListDescription>
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
            {createdAt ? new Date(createdAt).toLocaleString() : '-'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};

export default ModelInformationTab;
