import React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';
import { getILabLabels, removeILabLabels } from '~/pages/modelCatalog/utils';
import { ReservedILabLabel } from '~/pages/modelCatalog/const';

const TRUNCATED_MAX_LABEL_NUM = 2;

type ModelCatalogLabelsProps = {
  labels?: string[];
  tasks?: string[];
  showNonILabLabels?: boolean;
  truncate?: boolean;
};

export const ModelCatalogLabels: React.FC<ModelCatalogLabelsProps> = ({
  labels = [],
  tasks = [],
  showNonILabLabels = false,
  truncate = false,
}) => (
  <LabelGroup
    numLabels={truncate ? TRUNCATED_MAX_LABEL_NUM : undefined}
    data-testid="model-catalog-label-group"
  >
    {getILabLabels(labels).map((label) => {
      switch (label) {
        case ReservedILabLabel.LabBase:
          return (
            <Label data-testid="model-catalog-label" color="yellow" variant="filled">
              LAB starter
            </Label>
          );
        case ReservedILabLabel.LabTeacher:
          return (
            <Label data-testid="model-catalog-label" color="purple" variant="filled">
              LAB teacher
            </Label>
          );
        case ReservedILabLabel.LabJudge:
          return (
            <Label data-testid="model-catalog-label" color="orange" variant="filled">
              LAB judge
            </Label>
          );
        default:
          return (
            <Label data-testid="model-catalog-label" key={label} variant="outline">
              {label}
            </Label>
          );
      }
    })}
    {tasks.map((task) => (
      <Label data-testid="model-catalog-label" key={task} variant="outline">
        {task}
      </Label>
    ))}
    {showNonILabLabels &&
      removeILabLabels(labels).map((label) => (
        <Label data-testid="model-catalog-label" key={label} variant="outline">
          {label}
        </Label>
      ))}
  </LabelGroup>
);
