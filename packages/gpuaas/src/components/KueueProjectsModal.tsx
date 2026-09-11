import * as React from 'react';
/* eslint-disable @odh-dashboard/no-restricted-imports */
import {
  Alert,
  Bullseye,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Spinner,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import KueueProjectsModalRow from './KueueProjectsModalRow';
import {
  KUEUE_PROJECTS_MODAL_DESCRIPTION,
  KUEUE_PROJECTS_MODAL_TITLE,
  kueueProjectsColumns,
} from './kueueProjectsModalConst';
import useKueueProjectsForClusterQueue from '../hooks/useKueueProjectsForClusterQueue';

export type KueueProjectsModalProps = {
  clusterQueueName: string;
  onClose: () => void;
};

const KueueProjectsModal: React.FC<KueueProjectsModalProps> = ({ clusterQueueName, onClose }) => {
  const [filterText, setFilterText] = React.useState('');
  const { data: projects, loaded, error } = useKueueProjectsForClusterQueue(clusterQueueName);

  const filteredProjects = React.useMemo(() => {
    const normalized = filterText.trim().toLowerCase();
    if (!normalized) {
      return projects;
    }

    return projects.filter((project) => project.name.toLowerCase().includes(normalized));
  }, [filterText, projects]);

  const onClearFilters = React.useCallback(() => {
    setFilterText('');
  }, []);

  const modalBody = error ? (
    <Alert
      isInline
      variant="danger"
      title="Error loading Kueue projects"
      data-testid="kueue-projects-error-alert"
    >
      {error.message}
    </Alert>
  ) : !loaded ? (
    <Bullseye data-testid="kueue-projects-loading">
      <Spinner />
    </Bullseye>
  ) : (
    <Table
      data-testid="kueue-projects-table"
      aria-label="Kueue projects table"
      variant="compact"
      enablePagination="compact"
      defaultSortColumn={0}
      data={filteredProjects}
      columns={kueueProjectsColumns}
      toolbarContent={
        <ToolbarGroup>
          <ToolbarItem>
            <SearchInput
              aria-label="Find by name"
              placeholder="Find by name"
              value={filterText}
              onChange={(_event, value) => setFilterText(value)}
              onClear={() => setFilterText('')}
              data-testid="kueue-projects-name-filter"
            />
          </ToolbarItem>
        </ToolbarGroup>
      }
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      onClearFilters={onClearFilters}
      rowRenderer={(project) => <KueueProjectsModalRow key={project.name} project={project} />}
    />
  );

  return (
    <Modal
      isOpen
      variant="medium"
      onClose={onClose}
      data-testid="kueue-projects-modal"
      aria-labelledby="kueue-projects-modal-title"
    >
      <ModalHeader
        title={KUEUE_PROJECTS_MODAL_TITLE}
        labelId="kueue-projects-modal-title"
        description={KUEUE_PROJECTS_MODAL_DESCRIPTION}
      />
      <ModalBody>{modalBody}</ModalBody>
      <ModalFooter>
        <Button data-testid="kueue-projects-close-button" variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default KueueProjectsModal;
