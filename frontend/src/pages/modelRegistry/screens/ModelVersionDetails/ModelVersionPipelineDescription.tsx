import React from 'react';
import { Button, Content, Flex, FlexItem, Popover, Stack, StackItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { FindAdministratorOptions } from '~/pages/projects/screens/projects/const';
import PopoverListContent from '~/components/PopoverListContent';
import { globalPipelineRunDetailsRoute } from '~/routes';
import { ModelVersionPipelineDescriptionProps } from './const';

const ModelVersionPipelineDescription: React.FC<ModelVersionPipelineDescriptionProps> = ({
  sourceInfo: { project, runId, runName },
  catalogModelUrl,
}) => {
  const { projects } = React.useContext(ProjectsContext);
  const registeredPipelineProject = projects.find((p) => p.metadata.name === project);

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
};

export default ModelVersionPipelineDescription;
