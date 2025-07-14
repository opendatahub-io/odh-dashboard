import React from 'react';
import { Button, Content, Flex, FlexItem, Popover, Stack, StackItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { FindAdministratorOptions } from '#~/pages/projects/screens/projects/const';
import PopoverListContent from '#~/components/PopoverListContent';
import { globalPipelineRunDetailsRoute } from '#~/routes/pipelines/runs';
import { getCatalogModelDetailsRoute } from '#~/routes/modelCatalog/catalogModelDetails';
import { ModelArtifact } from '#~/concepts/modelRegistry/types';
import DashboardDescriptionListGroup from '#~/components/DashboardDescriptionListGroup';
import {
  modelSourcePropertiesToCatalogParams,
  modelSourcePropertiesToPipelineRunRef,
} from '#~/concepts/modelRegistry/utils';

type ModelVersionRegisteredFromLinkProps = {
  modelArtifact: ModelArtifact;
  isModelCatalogAvailable: boolean;
};

const ModelVersionRegisteredFromLink: React.FC<ModelVersionRegisteredFromLinkProps> = ({
  modelArtifact,
  isModelCatalogAvailable,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const registeredFromCatalogDetails = modelSourcePropertiesToCatalogParams(modelArtifact);
  const registeredFromPipelineDetails = modelSourcePropertiesToPipelineRunRef(modelArtifact);

  const registeredfromText = (
    <span className="pf-v6-u-font-weight-bold" data-testid="registered-from-catalog">
      {registeredFromCatalogDetails?.modelName} ({registeredFromCatalogDetails?.tag})
    </span>
  );

  if (!registeredFromCatalogDetails && !registeredFromPipelineDetails) {
    return null;
  }

  const renderContent = () => {
    if (registeredFromPipelineDetails) {
      const registeredPipelineProject = projects.find(
        (project) => project.metadata.name === registeredFromPipelineDetails.project,
      );

      const renderRunLink = registeredPipelineProject ? (
        <Link
          className="pf-v6-u-font-weight-bold"
          to={globalPipelineRunDetailsRoute(
            registeredFromPipelineDetails.project,
            registeredFromPipelineDetails.runId,
          )}
        >
          {registeredFromPipelineDetails.runName}
        </Link>
      ) : (
        <b>{registeredFromPipelineDetails.runName}</b>
      );

      const renderProject = registeredPipelineProject
        ? registeredPipelineProject.metadata.annotations?.['openshift.io/display-name'] ??
          registeredPipelineProject.metadata.name
        : registeredFromPipelineDetails.project;

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
          {!registeredPipelineProject && (
            <FlexItem>
              <Popover
                data-testid="project-access-info-popover"
                bodyContent={
                  <Stack hasGutter>
                    <StackItem>
                      <Content>
                        You don&apos;t have access to the source run. To request access, contact
                        your administrator.
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

    if (registeredFromCatalogDetails) {
      const catalogModelUrl = getCatalogModelDetailsRoute(registeredFromCatalogDetails);
      return (
        <>
          {isModelCatalogAvailable ? (
            <Link to={catalogModelUrl}>{registeredfromText}</Link>
          ) : (
            registeredfromText
          )}{' '}
          in Model catalog
        </>
      );
    }

    return null;
  };

  const content = renderContent();
  if (!content) {
    return null;
  }

  return (
    <DashboardDescriptionListGroup title="Registered from" groupTestId="registered-from-title">
      {content}
    </DashboardDescriptionListGroup>
  );
};

export default ModelVersionRegisteredFromLink;
