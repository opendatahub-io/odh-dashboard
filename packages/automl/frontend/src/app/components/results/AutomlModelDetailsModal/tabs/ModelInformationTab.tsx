import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core';
import type { TabContentProps } from '~/app/components/results/AutomlModelDetailsModal/tabConfig';

const ModelInformationTab: React.FC<TabContentProps> = ({ model, labelColumn, createdAt }) => (
  <>
    <Title headingLevel="h3" className="pf-v6-u-mb-lg">
      Experiment parameters
    </Title>
    <DescriptionList isHorizontal isCompact className="automl-model-info-list">
      <DescriptionListGroup>
        <DescriptionListTerm>Prediction column</DescriptionListTerm>
        <DescriptionListDescription>{labelColumn}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Evaluation metric</DescriptionListTerm>
        <DescriptionListDescription>{model.model_config.eval_metric}</DescriptionListDescription>
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

export default ModelInformationTab;
