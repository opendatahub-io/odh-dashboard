import React from 'react';
import {
  PageSection,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Flex,
  FlexItem,
  Button,
} from '@patternfly/react-core';
import { OutlinedFolderIcon } from '@patternfly/react-icons';
import { useSearchParams, Link } from 'react-router-dom';
import { useNamespaces } from '~/app/hooks/useNamespaces';

// TODO: Replace with isAvailableProject from @odh-dashboard/k8s-core when BFF returns filtered projects
const HIDDEN_NS_PREFIXES = ['openshift-', 'kube-'];
const HIDDEN_NS = ['openshift', 'default', 'system', 'redhat-ods-applications'];

const DataRegistryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProject = searchParams.get('project') || '';
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);

  const [namespaces, namespacesLoaded, namespacesError] = useNamespaces();

  const projects = React.useMemo(
    () =>
      namespaces.filter(
        (ns) =>
          !HIDDEN_NS_PREFIXES.some((prefix) => ns.name.startsWith(prefix)) &&
          !HIDDEN_NS.includes(ns.name),
      ),
    [namespaces],
  );

  const selectedProject = projects.some((p) => p.name === requestedProject) ? requestedProject : '';

  const handleProjectSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (value && value !== '__none__') {
        setSearchParams((prev) => {
          const params = new URLSearchParams(prev);
          params.set('project', String(value));
          return params;
        });
      }
      setIsProjectOpen(false);
    },
    [setSearchParams],
  );

  if (namespacesError) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState
          headingLevel="h2"
          titleText="Error loading projects"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>{namespacesError.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!namespacesLoaded) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState headingLevel="h2" titleText="Loading" variant={EmptyStateVariant.lg}>
          <Spinner size="xl" />
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
            <Select
              isOpen={isProjectOpen}
              selected={selectedProject}
              onSelect={handleProjectSelect}
              onOpenChange={setIsProjectOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsProjectOpen((prev) => !prev)}
                  isExpanded={isProjectOpen}
                  aria-label="Select a project"
                  data-testid="project-selector"
                >
                  {selectedProject || 'Select a project'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {projects.map((ns) => (
                  <SelectOption key={ns.name} value={ns.name}>
                    {ns.name}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FlexItem>
          {selectedProject ? (
            <FlexItem>
              <Button
                variant="link"
                data-testid="go-to-project-link"
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
