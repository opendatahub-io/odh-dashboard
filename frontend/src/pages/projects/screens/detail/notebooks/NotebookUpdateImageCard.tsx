import { Card, CardHeader, CardBody, Stack, StackItem, Title } from '@patternfly/react-core';
import * as React from 'react';
import { ImageStreamSpecTagType } from '#~/k8sTypes';
import NotebookImagePackageDetails from '#~/pages/projects/notebook/NotebookImagePackageDetails';
import {
  getImageVersionDependencies,
  getImageVersionSoftwareString,
} from '#~/pages/projects/screens/spawner/spawnerUtils';

type NotebookUpdateImageCardProps = {
  id: string;
  cardSelectorLabel: string;
  imageCard: string;
  imageVersion?: ImageStreamSpecTagType;
  title: string;
  onImageChange: (event: React.FormEvent<HTMLInputElement>) => void;
};

export const NotebookUpdateImageCard: React.FC<NotebookUpdateImageCardProps> = ({
  id,
  cardSelectorLabel,
  imageCard,
  imageVersion,
  title,
  onImageChange,
}) => (
  <Card id={id} isSelectable isSelected={imageCard === cardSelectorLabel} data-testid={id}>
    <CardHeader
      selectableActions={{
        selectableActionId: cardSelectorLabel,
        selectableActionAriaLabelledby: id,
        name: 'image-cards',
        variant: 'single',
        onChange: onImageChange,
        hasNoOffset: true,
      }}
    >
      <Title headingLevel="h2">{title}</Title>
      {imageVersion?.name}{' '}
      {imageVersion?.annotations?.['opendatahub.io/notebook-build-commit']
        ? `(${imageVersion.annotations['opendatahub.io/notebook-build-commit']})`
        : ''}
    </CardHeader>
    {imageVersion && (
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h4">Software</Title>
            {getImageVersionSoftwareString(imageVersion)}
          </StackItem>
          <StackItem>
            <NotebookImagePackageDetails
              dependencies={getImageVersionDependencies(imageVersion)}
              title={<Title headingLevel="h4">Packages</Title>}
            />
          </StackItem>
        </Stack>
      </CardBody>
    )}
  </Card>
);
