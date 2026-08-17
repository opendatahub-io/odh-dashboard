import React from 'react';
import {
  Bullseye,
  PageSection,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Button,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, OutlinedFolderIcon } from '@patternfly/react-icons';
import { useSearchParams, Link } from 'react-router-dom';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/ui-core/components/SimpleSelect';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';

const DataRegistryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProject = searchParams.get('project') || '';
  const { projects, loaded, loadError } = React.useContext(ProjectsContext);
  const selectedProject = projects.some((p) => p.metadata.name === requestedProject)
    ? requestedProject
    : '';

  const projectOptions: SimpleSelectOption[] = React.useMemo(
    () =>
      projects.map((p) => ({
        key: p.metadata.name,
        label: p.metadata.name,
      })),
    [projects],
  );

  const handleProjectSelect = React.useCallback(
    (key: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set('project', key);
        return params;
      });
    },
    [setSearchParams],
  );

  if (!loaded) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (loadError) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState
          headingLevel="h2"
          titleText="Unable to load projects"
          icon={ExclamationCircleIcon}
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{loadError.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem>
            <OutlinedFolderIcon /> Project
          </FlexItem>
          <FlexItem>
            <SimpleSelect
              value={selectedProject}
              onChange={handleProjectSelect}
              options={projectOptions}
              placeholder="Select a project"
              dataTestId="project-selector"
            />
          </FlexItem>
          {selectedProject ? (
            <FlexItem>
              <Button
                variant="link"
                component={(props) => <Link {...props} to={`/projects/${selectedProject}`} />}
              >
                Go to <OutlinedFolderIcon /> {selectedProject}
              </Button>
            </FlexItem>
          ) : null}
        </Flex>
      </PageSection>

      {!selectedProject ? (
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState headingLevel="h2" titleText="Select a project" variant={EmptyStateVariant.lg}>
            <EmptyStateBody>
              Choose a project from the dropdown above to browse data assets.
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      ) : (
        <PageSection hasBodyWrapper={false} isFilled>
          <Content>
            <Content component="p">
              Browsing data assets in <strong>{selectedProject}</strong>
            </Content>
          </Content>
        </PageSection>
      )}
    </>
  );
};

export default DataRegistryPage;
