import * as React from 'react';
/* eslint-disable @odh-dashboard/no-restricted-imports */
import {
  Alert,
  Bullseye,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Spinner,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { Tr, Td } from '@patternfly/react-table';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
import type { SortableData } from '@odh-dashboard/ui-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import { getDisplayNameFromK8sResource, type ProjectKind } from '@odh-dashboard/k8s-core';
import {
  NON_KUEUE_PROJECTS_MODAL_DESCRIPTION,
  NON_KUEUE_PROJECTS_MODAL_TITLE,
  NON_KUEUE_PROJECT_STATUS_LABEL,
} from '../const';

type NonKueueManagedProjectsModalProps = {
  projects: ProjectKind[];
  loaded: boolean;
  error?: Error;
  onClose: () => void;
};

const columns: SortableData<ProjectKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
  },
  {
    field: 'status',
    label: 'Status',
    sortable: false,
  },
];

const NonKueueManagedProjectsModal: React.FC<NonKueueManagedProjectsModalProps> = ({
  projects,
  loaded,
  error,
  onClose,
}) => {
  const [filterText, setFilterText] = React.useState('');

  const filteredProjects = React.useMemo(() => {
    const normalized = filterText.trim().toLowerCase();
    if (!normalized) {
      return projects;
    }

    return projects.filter((project) => {
      const displayName = getDisplayNameFromK8sResource(project).toLowerCase();
      const name = project.metadata.name.toLowerCase();
      return displayName.includes(normalized) || name.includes(normalized);
    });
  }, [filterText, projects]);

  const onClearFilters = React.useCallback(() => {
    setFilterText('');
  }, []);

  return (
    <Modal
      isOpen
      variant="medium"
      onClose={onClose}
      data-testid="non-kueue-managed-projects-modal"
      aria-labelledby="non-kueue-managed-projects-modal-title"
    >
      <ModalHeader
        title={NON_KUEUE_PROJECTS_MODAL_TITLE}
        labelId="non-kueue-managed-projects-modal-title"
        description={NON_KUEUE_PROJECTS_MODAL_DESCRIPTION}
      />
      <ModalBody>
        {error && (
          <Alert
            className="pf-v6-u-mb-md"
            data-testid="non-kueue-managed-projects-error"
            variant="danger"
            isInline
            title={error.message}
          />
        )}
        {!loaded ? (
          <Bullseye className="pf-v6-u-p-lg" data-testid="non-kueue-managed-projects-loading">
            <Spinner />
          </Bullseye>
        ) : (
          <Table
            data-testid="non-kueue-managed-projects-table"
            aria-label="Projects not managed by Kueue table"
            variant="compact"
            enablePagination="compact"
            data={filteredProjects}
            columns={columns}
            toolbarContent={
              <ToolbarGroup>
                <ToolbarItem>
                  <SearchInput
                    aria-label="Find by name"
                    placeholder="Find by name"
                    value={filterText}
                    onChange={(_event, value) => setFilterText(value)}
                    onClear={() => setFilterText('')}
                    data-testid="non-kueue-managed-projects-search"
                  />
                </ToolbarItem>
              </ToolbarGroup>
            }
            emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
            onClearFilters={onClearFilters}
            rowRenderer={(project) => (
              <Tr key={project.metadata.uid ?? project.metadata.name}>
                <Td dataLabel="Name">{getDisplayNameFromK8sResource(project)}</Td>
                <Td dataLabel="Status">
                  <Label color="grey">{NON_KUEUE_PROJECT_STATUS_LABEL}</Label>
                </Td>
              </Tr>
            )}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="non-kueue-managed-projects-close-button"
          variant="primary"
          onClick={onClose}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default NonKueueManagedProjectsModal;
