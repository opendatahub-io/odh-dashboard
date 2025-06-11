import React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';
import { getILabLabels, removeILabLabels } from '#~/pages/modelCatalog/utils';
import { ReservedILabLabel } from '#~/pages/modelCatalog/const';

export const ModelCatalogLabels: React.FC<{
  labels?: string[];
  tasks?: string[];
  showNonILabLabels?: boolean;
  numLabels?: number;
}> = ({ labels = [], tasks = [], showNonILabLabels = false, numLabels }) => (
  <LabelGroup numLabels={numLabels} data-testid="model-catalog-label-group">
    {getILabLabels(labels).map((label) => {
      switch (label) {
        case ReservedILabLabel.LabBase:
          return (
            <Label key={label} data-testid="model-catalog-label" color="yellow" variant="filled">
              LAB starter
            </Label>
          );
        case ReservedILabLabel.LabTeacher:
          return (
            <Label key={label} data-testid="model-catalog-label" color="purple" variant="filled">
              LAB teacher
            </Label>
          );
        case ReservedILabLabel.LabJudge:
          return (
            <Label key={label} data-testid="model-catalog-label" color="orange" variant="filled">
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
