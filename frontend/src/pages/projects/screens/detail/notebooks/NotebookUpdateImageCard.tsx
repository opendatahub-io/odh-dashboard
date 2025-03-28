import { Card, CardHeader, CardBody, Stack, StackItem, Title } from '@patternfly/react-core';
import * as React from 'react';
import { ImageStreamSpecTagType } from '~/k8sTypes';
import { NameVersionPair } from '~/types';

type NotebookUpdateImageCardProps = {
  id: string;
  cardSelectorLabel: string;
  imageCard: string;
  imageVersion: ImageStreamSpecTagType;
  title: string;
  onImageChange: (event: React.FormEvent<HTMLInputElement>) => void;
};

const getImageNameSoftwareVersionJSON = (
  imageSoftwareVersion: string | undefined,
): NameVersionPair[] => {
  if (!imageSoftwareVersion) {
    return [];
  }
  return JSON.parse(imageSoftwareVersion);
};

const getNameImageSoftwareVersion = (
  imageSoftwareVersion: string | undefined,
): string | undefined => {
  const imageNameSoftwareVersionJSON = getImageNameSoftwareVersionJSON(imageSoftwareVersion);
  return `${imageNameSoftwareVersionJSON.at(0)?.name ?? ''} ${
    imageNameSoftwareVersionJSON.at(0)?.version ?? ''
  }`;
};

const displayImageSoftwareDependencies = (
  imageSoftwareVersions: string | undefined,
): React.ReactNode => {
  const imageNameSoftwareVersionJSON = getImageNameSoftwareVersionJSON(imageSoftwareVersions);
  return (
    <>
      {imageNameSoftwareVersionJSON.map((value, index) => (
        <p key={index}>{`${value.name} ${value.version}`}</p>
      ))}
    </>
  );
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
      {imageVersion.name}{' '}
      {imageVersion.annotations?.['opendatahub.io/notebook-build-commit']
        ? `(${imageVersion.annotations['opendatahub.io/notebook-build-commit']})`
        : ''}
    </CardHeader>
    <CardBody>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h4">Software</Title>
          {getNameImageSoftwareVersion(
            imageVersion.annotations?.['opendatahub.io/notebook-software'],
          )}
        </StackItem>
        <StackItem>
          <Title headingLevel="h4">Packages</Title>
          {displayImageSoftwareDependencies(
            imageVersion.annotations?.['opendatahub.io/notebook-python-dependencies'],
          )}
        </StackItem>
      </Stack>
    </CardBody>
  </Card>
);
