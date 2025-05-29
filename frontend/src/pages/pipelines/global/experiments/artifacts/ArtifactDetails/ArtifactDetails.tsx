import React from 'react';
import { useParams } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { PipelineCoreDetailsPageComponent } from '#~/concepts/pipelines/content/types';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import {
  getArtifactName,
  getIsArtifactModelRegistered,
} from '#~/pages/pipelines/global/experiments/artifacts/utils';
import { ArtifactDetailsTabKey } from '#~/pages/pipelines/global/experiments/artifacts/constants';
import { useGetArtifactById } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactById';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { ArtifactOverviewDetails } from './ArtifactOverviewDetails';
import ArtifactDetailsTitle from './ArtifactDetailsTitle';

export const ArtifactDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { artifactId } = useParams();
  const [artifact, isArtifactLoaded, artifactError] = useGetArtifactById(Number(artifactId));
  const artifactName = getArtifactName(artifact);
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);
  const isArtifactModelRegistered = modelRegistryAvailable
    ? getIsArtifactModelRegistered(artifact)
    : false;

  if (artifactError) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Error loading artifact details"
        variant={EmptyStateVariant.lg}
      >
        <EmptyStateBody>{artifactError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!isArtifactLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      title={
        <ArtifactDetailsTitle
          name={artifactName}
          isArtifactModelRegistered={isArtifactModelRegistered}
        />
      }
      loaded={isArtifactLoaded}
      loadError={artifactError}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
            <Truncate content={artifactName} />
          </BreadcrumbItem>
        </Breadcrumb>
      }
      empty={false}
      provideChildrenPadding
    >
      <Tabs aria-label="Artifact details tabs" activeKey={ArtifactDetailsTabKey.Overview}>
        <Tab
          eventKey={ArtifactDetailsTabKey.Overview}
          title={<TabTitleText>Overview</TabTitleText>}
          aria-label="Overview"
        >
          <ArtifactOverviewDetails artifact={artifact} />
        </Tab>
        <Tab
          eventKey={ArtifactDetailsTabKey.LineageExplorer}
          title={<TabTitleText>Lineage explorer</TabTitleText>}
          isAriaDisabled
        />
      </Tabs>
    </ApplicationsPage>
  );
};
