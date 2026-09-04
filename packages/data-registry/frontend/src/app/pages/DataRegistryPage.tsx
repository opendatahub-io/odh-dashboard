import React from 'react';
import {
  PageSection,
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
import { useCollections } from '~/app/hooks/useCollections';
import { useAssets } from '~/app/hooks/useAssets';
import { useLabels } from '~/app/hooks/useLabels';
import { is503Error, is403Error, isConnectionError } from '~/app/api/dataRegistry';
import RegistryTable from '~/app/components/RegistryTable';
import ManageCollectionsModal from '~/app/components/ManageCollectionsModal';
import ManageLabelsModal from '~/app/components/ManageLabelsModal';
import RegisterDataModal from '~/app/components/RegisterDataModal';
import ServiceUnavailableError from '~/app/components/errors/ServiceUnavailableError';
import AccessDeniedError from '~/app/components/errors/AccessDeniedError';
import ConnectionError from '~/app/components/errors/ConnectionError';

// TODO: Replace with isAvailableProject from @odh-dashboard/k8s-core when BFF returns filtered projects
const HIDDEN_NS_PREFIXES = ['openshift-', 'kube-'];
const HIDDEN_NS = ['openshift', 'default', 'system', 'redhat-ods-applications'];

const DataRegistryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProject = searchParams.get('project') || '';
  const [isProjectOpen, setIsProjectOpen] = React.useState(false);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = React.useState(false);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = React.useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false);

  const [namespaces, namespacesLoaded, namespacesError, namespacesRefresh] = useNamespaces();

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

  const [assets, assetsLoaded, assetsError, assetsRefresh, collectionNames] =
    useAssets(selectedProject);
  const [collections, collectionsLoaded, collectionsError, collectionsRefresh] = useCollections(
    selectedProject,
    assets,
    collectionNames,
  );
  const [labels, , , labelsRefresh] = useLabels(selectedProject);

  const hasWriteAccess = !is403Error(assetsError) && !is403Error(collectionsError);

  const handleRefresh = React.useCallback(() => {
    assetsRefresh();
    collectionsRefresh();
    labelsRefresh();
  }, [assetsRefresh, collectionsRefresh, labelsRefresh]);

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
    if (is503Error(namespacesError)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <ServiceUnavailableError onRetry={namespacesRefresh} error={namespacesError} />
        </PageSection>
      );
    }
    if (is403Error(namespacesError)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <AccessDeniedError error={namespacesError} />
        </PageSection>
      );
    }
    if (isConnectionError(namespacesError)) {
      return (
        <PageSection hasBodyWrapper={false} isFilled>
          <ConnectionError onRetry={namespacesRefresh} error={namespacesError} />
        </PageSection>
      );
    }
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
        <>
          <RegistryTable
            assets={assets}
            loaded={assetsLoaded && collectionsLoaded}
            error={assetsError ?? collectionsError}
            labels={labels}
            project={selectedProject}
            onManageCollections={() => {
              if (!collectionsError) {
                setIsCollectionsModalOpen(true);
              }
            }}
            onManageLabels={() => setIsLabelsModalOpen(true)}
            onRegisterData={() => setIsRegisterModalOpen(true)}
            onRetry={handleRefresh}
            hasWriteAccess={hasWriteAccess}
          />
          <ManageCollectionsModal
            isOpen={isCollectionsModalOpen}
            onClose={() => setIsCollectionsModalOpen(false)}
            project={selectedProject}
            collections={collections}
            onRefresh={handleRefresh}
          />
          <ManageLabelsModal
            isOpen={isLabelsModalOpen}
            onClose={() => setIsLabelsModalOpen(false)}
            project={selectedProject}
            labels={labels}
            assets={assets}
            onRefresh={handleRefresh}
          />
          <RegisterDataModal
            isOpen={isRegisterModalOpen}
            onClose={() => setIsRegisterModalOpen(false)}
            project={selectedProject}
            collections={collectionNames}
            onCreated={handleRefresh}
            onManageCollections={() => {
              setIsRegisterModalOpen(false);
              setIsCollectionsModalOpen(true);
            }}
          />
        </>
      )}
    </>
  );
};

export default DataRegistryPage;
