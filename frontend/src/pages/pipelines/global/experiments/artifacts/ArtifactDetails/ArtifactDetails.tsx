import React from 'react';
import { useParams } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { useGetArtifactById } from '~/pages/pipelines/global/experiments/artifacts/useGetArtifactById';
import { getArtifactName } from '~/pages/pipelines/global/experiments/artifacts/utils';
import { ArtifactDetailsTabKey } from '~/pages/pipelines/global/experiments/artifacts/constants';
import { ArtifactOverviewDetails } from './ArtifactOverviewDetails';

export const ArtifactDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { artifactId } = useParams();
  const [artifactResponse, isArtifactLoaded, artifactError] = useGetArtifactById(
    Number(artifactId),
  );
  const artifact = artifactResponse?.toObject();
  const artifactName = getArtifactName(artifact);

  if (artifactError) {
    return (
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText="Error loading artifact details"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h4"
        />
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
      title={artifactName ?? 'Error loading artifact'}
      loaded={isArtifactLoaded}
      loadError={artifactError}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
            <Truncate content={artifactName ?? 'Loading...'} />
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
