import * as React from 'react';
import {
  Alert,
  Badge,
  Button,
  Bullseye,
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  // ContentModal does not support the split create/select footer required here.
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  Modal,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalBody,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalFooter,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalHeader,
  SearchInput,
  Stack,
  StackItem,
  Title,
  Truncate,
} from '@patternfly/react-core';
import {
  CheckIcon,
  ExclamationCircleIcon,
  OutlinedFolderIcon,
  SearchIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { type ProjectIdentity, useWorkingProject } from '../../context/WorkingProjectContext';
import DashboardModalFooter from '../DashboardModalFooter';
import SimpleSelect from '../SimpleSelect';
import './WorkingProjectSelector.scss';

type Props = {
  getProjectDescription?: (name: string) => string;
  isAiProject?: (name: string) => boolean;
  aiLabel?: React.ReactNode;
  getProjectHref?: (name: string) => string;
  onCreateProject?: (isEmpty: boolean) => void;
  onProjectSelected?: (project: ProjectIdentity) => void;
  emptyListContent: React.ReactNode;
};

const WorkingProjectSelector: React.FC<Props> = (props) => {
  const { status, activeProject } = useWorkingProject();
  const [open, setOpen] = React.useState(false);
  const label = activeProject
    ? `Project: ${activeProject.displayName || activeProject.name}`
    : status === 'loading'
    ? 'Loading projects'
    : status === 'empty-list'
    ? 'No projects'
    : 'Projects unavailable';

  return (
    <>
      <Button
        variant="tertiary"
        className="odh-working-project-selector"
        data-testid="working-project-selector"
        aria-haspopup="dialog"
        isDisabled={status === 'loading'}
        isLoading={status === 'loading'}
        icon={
          status === 'empty-list' ? (
            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
          ) : (
            <OutlinedFolderIcon />
          )
        }
        onClick={() => {
          if (status === 'empty-list' && props.onCreateProject) {
            props.onCreateProject(true);
          } else {
            setOpen(true);
          }
        }}
      >
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem className="odh-working-project-selector__name">
            <Truncate content={label} tooltipPosition="bottom" />
          </FlexItem>
          {activeProject && props.isAiProject?.(activeProject.name) && (
            <FlexItem>{props.aiLabel}</FlexItem>
          )}
        </Flex>
      </Button>
      {open && <WorkingProjectModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
};

const WorkingProjectModal: React.FC<Props & { onClose: () => void }> = ({
  getProjectDescription,
  isAiProject,
  aiLabel,
  getProjectHref,
  onCreateProject,
  onProjectSelected,
  emptyListContent,
  onClose,
}) => {
  const headingId = React.useId();
  const descriptionId = React.useId();
  const { status, projects, activeProject, selectProject } = useWorkingProject();
  const [selectedName, setSelectedName] = React.useState(activeProject?.name ?? '');
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState(isAiProject ? 'ai' : 'all');
  const aiProjectCount = isAiProject ? projects.filter(({ name }) => isAiProject(name)).length : 0;
  const filterToggleLabel = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>AI projects only</FlexItem>
      <FlexItem>
        <Badge
          isRead
          className="odh-working-project-selector__count"
          screenReaderText="AI projects"
        >
          {aiProjectCount}
        </Badge>
      </FlexItem>
      {aiLabel && <FlexItem>{aiLabel}</FlexItem>}
    </Flex>
  );
  const selectedProject = projects.find(({ name }) => name === selectedName);
  const visibleProjects = projects.filter(({ name, displayName }) => {
    const query = search.trim().toLowerCase();
    return (
      (filter !== 'ai' || isAiProject?.(name)) &&
      (!query ||
        [name, displayName, getProjectDescription?.(name)].some((value) =>
          value?.toLowerCase().includes(query),
        ))
    );
  });
  const canSelectProject = status === 'listed' || status === 'listing-unavailable';
  const activeLabel = activeProject?.displayName || activeProject?.name;
  const projectHref = activeProject ? getProjectHref?.(activeProject.name) : undefined;

  return (
    <Modal
      variant={status === 'empty-list' ? 'medium' : 'large'}
      isOpen
      onClose={onClose}
      aria-labelledby={headingId}
      aria-describedby={
        status === 'listed' || status === 'listing-unavailable' ? descriptionId : undefined
      }
    >
      <ModalHeader
        title={status === 'empty-list' ? 'No projects' : 'Working project'}
        labelId={headingId}
        descriptorId={descriptionId}
        description={
          status === 'listed' || status === 'listing-unavailable'
            ? 'Choose the project you want to work in.'
            : undefined
        }
      />
      <ModalBody>
        <Stack hasGutter>
          {status === 'loading' ? (
            <Content>Loading projects…</Content>
          ) : status === 'empty-list' ? (
            emptyListContent
          ) : status === 'project-source-error' || status === 'provider-absent' ? (
            <Alert isInline variant="danger" title="Projects unavailable">
              Unable to load projects. Try again later.
            </Alert>
          ) : (
            <>
              {activeProject && (
                <StackItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      Current working project: <strong>{activeLabel}</strong>
                    </FlexItem>
                    {projectHref && (
                      <FlexItem>
                        <Link to={projectHref} onClick={onClose}>
                          Go to <OutlinedFolderIcon /> <strong>{activeLabel}</strong>
                        </Link>
                      </FlexItem>
                    )}
                  </Flex>
                </StackItem>
              )}
              {status === 'listing-unavailable' && (
                <Alert isInline variant="info" title="Project listing unavailable">
                  Only individually validated projects are shown.
                </Alert>
              )}
              <StackItem>
                <Title headingLevel="h2" size="lg">
                  Available projects
                </Title>
              </StackItem>
              <StackItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'wrap' }}>
                  {isAiProject && (
                    <FlexItem>
                      <SimpleSelect
                        ariaLabel="Project type"
                        value={filter}
                        toggleLabel={filter === 'ai' ? filterToggleLabel : undefined}
                        onChange={setFilter}
                        options={[
                          { key: 'ai', label: 'AI projects only' },
                          { key: 'all', label: 'All projects' },
                        ]}
                      />
                    </FlexItem>
                  )}
                  <FlexItem flex={{ default: 'flex_1' }}>
                    <SearchInput
                      aria-label="Filter projects by name or description"
                      placeholder="Filter by name or description"
                      value={search}
                      onChange={(_event, value) => setSearch(value)}
                      onClear={() => setSearch('')}
                    />
                  </FlexItem>
                </Flex>
              </StackItem>
              {selectedName && !selectedProject && (
                <Alert isInline variant="warning" title="Selected project is no longer available">
                  Choose another project.
                </Alert>
              )}
              <StackItem>
                {visibleProjects.length === 0 ? (
                  <Bullseye className="odh-working-project-selector__no-results">
                    <EmptyState
                      icon={SearchIcon}
                      headingLevel="h3"
                      titleText="No results found"
                      variant="lg"
                      data-testid="working-project-no-results"
                    >
                      <EmptyStateBody>Adjust your filters and try again.</EmptyStateBody>
                    </EmptyState>
                  </Bullseye>
                ) : (
                  <DataList
                    aria-label="Available projects"
                    className="odh-working-project-selector__project-list"
                    gridBreakpoint="none"
                    selectedDataListItemId={selectedName}
                    onSelectDataListItem={(_event, name) => setSelectedName(name)}
                    onSelectableRowChange={(_event, name) => setSelectedName(name)}
                  >
                    {visibleProjects.map(({ name, displayName }) => (
                      <DataListItem
                        key={name}
                        id={name}
                        aria-labelledby={`working-project-${name}`}
                        data-testid={`working-project-option-${name}`}
                      >
                        <DataListItemRow>
                          <DataListItemCells
                            dataListCells={[
                              <DataListCell key="project" wrapModifier="breakWord">
                                <Stack>
                                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                                    <FlexItem>
                                      <strong id={`working-project-${name}`}>
                                        {displayName || name}
                                      </strong>
                                    </FlexItem>
                                    {isAiProject?.(name) && <FlexItem>{aiLabel}</FlexItem>}
                                  </Flex>
                                  {getProjectDescription?.(name) && (
                                    <Content
                                      component="small"
                                      className="pf-v6-u-text-color-subtle"
                                    >
                                      {getProjectDescription(name)}
                                    </Content>
                                  )}
                                </Stack>
                              </DataListCell>,
                              <DataListCell key="selection" isFilled={false}>
                                {selectedName === name && (
                                  <Flex
                                    alignItems={{ default: 'alignItemsCenter' }}
                                    className="pf-v6-u-h-100 pf-v6-u-text-color-brand"
                                  >
                                    <FlexItem>
                                      <CheckIcon aria-label="Selected project" />
                                    </FlexItem>
                                  </Flex>
                                )}
                              </DataListCell>,
                            ]}
                          />
                        </DataListItemRow>
                      </DataListItem>
                    ))}
                  </DataList>
                )}
              </StackItem>
            </>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Flex className="pf-v6-u-w-100" justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          {onCreateProject && status === 'listed' && (
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => {
                  onClose();
                  onCreateProject(false);
                }}
              >
                Create project
              </Button>
            </FlexItem>
          )}
          <FlexItem align={{ default: 'alignRight' }}>
            {canSelectProject ? (
              <DashboardModalFooter
                submitLabel="Select"
                onSubmit={() => {
                  if (selectedProject) {
                    selectProject(selectedProject);
                    onProjectSelected?.(selectedProject);
                    onClose();
                  }
                }}
                isSubmitDisabled={!selectedProject}
                onCancel={onClose}
              />
            ) : (
              <Button variant="link" onClick={onClose}>
                Close
              </Button>
            )}
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

export default WorkingProjectSelector;
