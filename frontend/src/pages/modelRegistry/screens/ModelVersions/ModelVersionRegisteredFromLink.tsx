import React from 'react';
import { Button, Content, Flex, FlexItem, Popover, Stack, StackItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { FindAdministratorOptions } from '~/pages/projects/screens/projects/const';
import PopoverListContent from '~/components/PopoverListContent';
import { globalPipelineRunDetailsRoute, getCatalogModelDetailsRoute } from '~/routes';
import { ModelArtifact } from '~/concepts/modelRegistry/types';
import {
  modelSourcePropertiesToCatalogParams,
  modelSourcePropertiesToPipelineRunRef,
} from '~/concepts/modelRegistry/utils';

/**
 * Props for the ModelVersionRegisteredFromLink component
 */
type ModelVersionRegisteredFromLinkProps = {
  modelArtifact: ModelArtifact;
};

/**
 * Component that displays where a model version was registered from
 * Uses utility functions to determine if it was from a pipeline run or catalog model
 */
const ModelVersionRegisteredFromLink: React.FC<ModelVersionRegisteredFromLinkProps> = ({
  modelArtifact,
}) => {
  const { projects } = React.useContext(ProjectsContext);

  // Extract information using utility functions
  const registeredFromCatalogDetails = modelSourcePropertiesToCatalogParams(
    modelArtifact.modelSourceKind,
    modelArtifact.modelSourceClass,
    modelArtifact.modelSourceGroup,
    modelArtifact.modelSourceName,
    modelArtifact.modelSourceId,
  );

  const registeredFromPipelineDetails = modelSourcePropertiesToPipelineRunRef(
    modelArtifact.modelSourceKind,
    modelArtifact.modelSourceGroup,
    modelArtifact.modelSourceId,
    modelArtifact.modelSourceName,
  );

  // If no source information is available, don't render anything
  if (!registeredFromCatalogDetails && !registeredFromPipelineDetails) {
    return null;
  }

  // Generate the catalog URL if we have catalog details
  const catalogModelUrl = registeredFromCatalogDetails
    ? getCatalogModelDetailsRoute(registeredFromCatalogDetails)
    : '';

  // For pipeline source, look up the project
  const registeredPipelineProject =
    registeredFromPipelineDetails &&
    projects.find((p) => p.metadata.name === registeredFromPipelineDetails.project);

  // If we have pipeline details, render the pipeline link
  if (registeredFromPipelineDetails) {
    const { project, runId, runName } = registeredFromPipelineDetails;

    // If we also have a catalog URL, link to the catalog
    const renderRunLink = catalogModelUrl ? (
      <Link
        to={catalogModelUrl}
        style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
        data-testid="catalog-model-link"
      >
        {runName}
      </Link>
    ) : registeredPipelineProject ? (
      <Link
        style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
        to={globalPipelineRunDetailsRoute(project, runId)}
      >
        {runName}
      </Link>
    ) : (
      <b>{runName}</b>
    );

    const renderProject = registeredPipelineProject
      ? registeredPipelineProject.metadata.annotations?.['openshift.io/display-name'] ??
        registeredPipelineProject.metadata.name
      : project;

    return (
      <Flex
        spaceItems={{ default: 'spaceItemsXs' }}
        alignItems={{ default: 'alignItemsCenter' }}
        data-testid="registered-from-pipeline"
      >
        <FlexItem data-testid="pipeline-run-link">Run {renderRunLink} in</FlexItem>
        <FlexItem style={{ display: 'flex' }}>
          <TypedObjectIcon
            resourceType={ProjectObjectType.project}
            style={{ height: 24, width: 24 }}
          />
        </FlexItem>
        <FlexItem>
          <b>{renderProject}</b>
        </FlexItem>
        {catalogModelUrl && (
          <FlexItem data-testid="catalog-model-info">
            <span style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
              (from Model Catalog)
            </span>
          </FlexItem>
        )}
        {!registeredPipelineProject && !catalogModelUrl && (
          <FlexItem>
            <Popover
              data-testid="project-access-info-popover"
              bodyContent={
                <Stack hasGutter>
                  <StackItem>
                    <Content>
                      You don&apos;t have access to the source run. To request access, contact your
                      administrator.
                    </Content>
                  </StackItem>
                  <StackItem>
                    <Content>Your administrator might be:</Content>
                    <PopoverListContent
                      data-testid="pipeline-project-button-popover"
                      listItems={[...FindAdministratorOptions, 'Your professor (at a school)']}
                    />
                  </StackItem>
                </Stack>
              }
            >
              <Button
                data-testid="project-access-info-button"
                icon={<OutlinedQuestionCircleIcon />}
                variant="link"
                aria-label="more info"
              />
            </Popover>
          </FlexItem>
        )}
      </Flex>
    );
  }

  // If we only have catalog details, render the catalog link
  if (registeredFromCatalogDetails && catalogModelUrl) {
    return (
      <a
        href={catalogModelUrl}
        data-testid="registered-from-catalog"
        style={{
          color: 'var(--pf-global--primary-color--100)',
          textDecoration: 'underline',
        }}
      >
        <span style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
          {modelArtifact.modelSourceName || ''} ({modelArtifact.modelSourceId || ''})
        </span>{' '}
        in Model catalog
      </a>
    );
  }

  // Fallback case - shouldn't reach here given the earlier checks
  return null;
};

export default ModelVersionRegisteredFromLink;
