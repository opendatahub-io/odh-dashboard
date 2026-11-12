import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
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
  EmptyStateActions,
  EmptyStateFooter,
  Flex,
  FlexItem,
  FormGroup,
  TextInput,
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
import { isValidK8sName } from '@odh-dashboard/k8s-core';
import {
  type ProjectIdentity,
  type WorkingProjectStatus,
  useWorkingProject,
  WorkingProjectSelectorLabelValue,
  WorkingProjectStatusLabelValue,
  WorkingProjectStatusValue,
} from '../../context/WorkingProjectContext';
import DashboardModalFooter from '../DashboardModalFooter';
import SimpleSelect from '../SimpleSelect';
import FieldGroupHelpLabelIcon from '../FieldGroupHelpLabelIcon';
import projectEmptyStateImage from '../../images/empty-state-projects-color.svg';
import './WorkingProjectSelector.scss';

type Props = {
  /** Opt into the xKS manual namespace UX when project listing is unavailable. */
  manualProjectMode?: boolean;
  getProjectDescription?: (name: string) => string;
  isAiProject?: (name: string) => boolean;
  aiLabel?: React.ReactNode;
  getProjectHref?: (name: string) => string;
  onCreateProject?: (isEmpty: boolean) => void;
  onProjectSelected?: (project: ProjectIdentity) => void;
  emptyListContent: React.ReactNode;
};

const getWorkingProjectLabel = (status: WorkingProjectStatus): string =>
  WorkingProjectStatusLabelValue[status];

const EmptyProjectIllustration: React.FC = () => (
  <img
    src={projectEmptyStateImage}
    alt=""
    className="odh-working-project-selector__empty-image"
    data-testid="working-project-empty-image"
  />
);

const AddProjectModal: React.FC<{
  manualProjectMode?: boolean;
  onClose: () => void;
  onAdded: (project: ProjectIdentity, isFirstProject: boolean) => void;
}> = ({ manualProjectMode = false, onClose, onAdded }) => {
  const headingId = React.useId();
  const errorId = React.useId();
  const [name, setName] = React.useState('');
  const [result, setResult] = React.useState<ProjectIdentity | null>(null);
  const [error, setError] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const request = React.useRef<AbortController | null>(null);
  const { projects, discoverProject, rememberProject } = useWorkingProject();
  const [isAddingProject, setIsAddingProject] = React.useState(false);
  const valid = name.length <= 63 && isValidK8sName(name);
  const cancel = () => {
    request.current?.abort();
    onClose();
  };
  React.useEffect(() => () => request.current?.abort(), []);

  const search = () => {
    if (!valid || searching || isAddingProject || !discoverProject) {
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSearching(true);
    setError('');
    setResult(null);
    void discoverProject(name, controller.signal)
      .then((project) => {
        if (!controller.signal.aborted && project.name === name) {
          setResult(project);
        } else if (!controller.signal.aborted) {
          setError('No access to that project, or it does not exist.');
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to search for projects.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      });
  };

  return (
    <Modal variant="medium" isOpen onClose={cancel} aria-labelledby={headingId}>
      <ModalHeader title="Add project" labelId={headingId} />
      <ModalBody>
        <Stack hasGutter>
          <Content component={manualProjectMode ? 'small' : undefined}>
            {manualProjectMode
              ? 'Search for an existing project by its resource name to add it to the project selector. Added projects remain visible in this browser until its data is cleared. This does not create a project or grant access.'
              : 'Find an existing project by its resource name and add it to your available projects. This does not create a project.'}
          </Content>
          <FormGroup
            label="Resource name"
            fieldId="manual-project-name"
            labelHelp={
              manualProjectMode ? (
                <FieldGroupHelpLabelIcon
                  title="Resource name"
                  content="Enter the exact Kubernetes namespace resource name, not its display name. You must have access to the project to add it."
                  buttonTestId="manual-project-name-help"
                  popoverBodyTestId="manual-project-name-help-content"
                />
              ) : undefined
            }
          >
            <Flex spaceItems={manualProjectMode ? { default: 'spaceItemsXs' } : undefined}>
              <FlexItem flex={{ default: 'flex_1' }}>
                <TextInput
                  id="manual-project-name"
                  data-testid="manual-project-name"
                  value={name}
                  isDisabled={isAddingProject}
                  placeholder="Enter resource name"
                  validated={manualProjectMode && error ? 'error' : undefined}
                  aria-invalid={manualProjectMode && error ? true : undefined}
                  aria-describedby={manualProjectMode && error ? errorId : undefined}
                  onChange={(_event, value) => {
                    if (isAddingProject) {
                      return;
                    }
                    request.current?.abort();
                    setName(value);
                    setResult(null);
                    setError('');
                    setSearching(false);
                  }}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  className={manualProjectMode ? 'pf-v6-u-px-lg' : undefined}
                  variant="secondary"
                  isDisabled={!valid || searching || isAddingProject}
                  isLoading={searching}
                  onClick={search}
                >
                  Search
                </Button>
              </FlexItem>
            </Flex>
            {manualProjectMode && result && (
              <Alert
                data-testid="manual-project-lookup-success"
                className="pf-v6-u-mt-sm"
                isInline
                isPlain
                isLiveRegion
                variant="success"
                title={`Found project "${name}". Select Add project to make it available.`}
              />
            )}
            {manualProjectMode && error && (
              <Alert
                id={errorId}
                data-testid="manual-project-lookup-error"
                className="pf-v6-u-mt-sm"
                isInline
                isPlain
                isLiveRegion
                variant="danger"
                title={error}
              />
            )}
          </FormGroup>
          {name && !valid && (
            <Alert
              isInline
              variant="danger"
              title="Enter a valid resource name (lowercase letters, numbers, and hyphens; maximum 63 characters)."
            />
          )}
          {!manualProjectMode && result && (
            <Alert
              isInline
              variant="success"
              title={`Found project "${name}". Select Add project to make it available.`}
            />
          )}
          {!manualProjectMode && error && <Alert isInline variant="danger" title={error} />}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Add project"
          onSubmit={() => {
            if (!result || result.name !== name || isAddingProject || !rememberProject) {
              return;
            }
            if (projects.some((project) => project.name === name)) {
              cancel();
              return;
            }
            const controller = new AbortController();
            request.current = controller;
            setIsAddingProject(true);
            void rememberProject(name, controller.signal)
              .then(() => {
                if (!controller.signal.aborted) {
                  onAdded(result, projects.length === 0);
                }
              })
              .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                  setResult(null);
                  setError(reason instanceof Error ? reason.message : 'Unable to add project.');
                }
              })
              .finally(() => {
                if (!controller.signal.aborted) {
                  setIsAddingProject(false);
                }
              });
          }}
          isSubmitDisabled={!result || searching || isAddingProject}
          isSubmitLoading={isAddingProject}
          onCancel={cancel}
        />
      </ModalFooter>
    </Modal>
  );
};

const WorkingProjectSelector: React.FC<Props> = (props) => {
  const { status, projects, activeProject, discoverProject, rememberProject } = useWorkingProject();
  const manualFallback = props.manualProjectMode && status === 'listing-unavailable';
  const [addedProject, setAddedProject] = React.useState<ProjectIdentity | null>(null);
  const [updatedProject, setUpdatedProject] = React.useState<ProjectIdentity | null>(null);
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setAdding(false);
    triggerRef.current?.focus();
  };
  const label = activeProject
    ? `Project: ${activeProject.displayName || activeProject.name}`
    : status === 'loading'
    ? 'Loading projects'
    : status === 'empty-list'
    ? 'No projects'
    : status === 'listing-unavailable'
    ? manualFallback && projects.length === 0
      ? 'No projects'
      : 'No project selected'
    : getWorkingProjectLabel(status);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="tertiary"
        className="odh-working-project-selector"
        data-testid="working-project-selector"
        aria-haspopup="dialog"
        isDisabled={status === WorkingProjectStatusValue.Loading}
        isLoading={status === WorkingProjectStatusValue.Loading}
        icon={
          status === WorkingProjectStatusValue.EmptyList ? (
            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
          ) : (
            <OutlinedFolderIcon />
          )
        }
        onClick={() => {
          if (status === WorkingProjectStatusValue.EmptyList && props.onCreateProject) {
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
      {open &&
        (adding && discoverProject && rememberProject ? (
          <AddProjectModal
            manualProjectMode={manualFallback}
            onClose={manualFallback ? close : () => setAdding(false)}
            onAdded={(project, isFirstProject) => {
              if (manualFallback) {
                setAddedProject(project);
              }
              if (manualFallback && isFirstProject) {
                setUpdatedProject(project);
                props.onProjectSelected?.(project);
                close();
              } else {
                setAdding(false);
              }
            }}
          />
        ) : (
          <WorkingProjectModal
            {...props}
            onProjectSelected={(project) => {
              if (manualFallback && project.name !== activeProject?.name) {
                setUpdatedProject(project);
              }
              props.onProjectSelected?.(project);
            }}
            onClose={close}
            onAddProject={discoverProject && rememberProject ? () => setAdding(true) : undefined}
          />
        ))}
      {(addedProject || updatedProject) && (
        <AlertGroup isToast aria-live="polite">
          {updatedProject && (
            <Alert
              data-testid="working-project-updated-notification"
              variant="info"
              title="Working project updated"
              actionClose={<AlertActionCloseButton onClose={() => setUpdatedProject(null)} />}
            >
              You&apos;re now working in{' '}
              <strong>{updatedProject.displayName || updatedProject.name}</strong>.
            </Alert>
          )}
          {addedProject && (
            <Alert
              data-testid="project-added-notification"
              variant="success"
              title="Project added"
              actionClose={<AlertActionCloseButton onClose={() => setAddedProject(null)} />}
            >
              “{addedProject.displayName || addedProject.name}” is now available in the project
              selector.
            </Alert>
          )}
        </AlertGroup>
      )}
    </>
  );
};

const WorkingProjectModal: React.FC<Props & { onClose: () => void; onAddProject?: () => void }> = ({
  manualProjectMode = false,
  getProjectDescription,
  isAiProject,
  aiLabel,
  getProjectHref,
  onCreateProject,
  onProjectSelected,
  emptyListContent,
  onClose,
  onAddProject,
}) => {
  const headingId = React.useId();
  const descriptionId = React.useId();
  const { status, projects, activeProject, selectProject } = useWorkingProject();
  const manualFallback = manualProjectMode && status === 'listing-unavailable';
  const [selecting, setSelecting] = React.useState(false);
  const [selectionError, setSelectionError] = React.useState<Error>();
  const close = () => {
    if (!selecting) {
      onClose();
    }
  };
  const [selectedName, setSelectedName] = React.useState(activeProject?.name ?? '');
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState(isAiProject ? 'ai' : 'all');
  const changeSelectedProject = (_event: React.SyntheticEvent, name: string) => {
    if (selecting) {
      return;
    }
    setSelectedName(name);
    setSelectionError(undefined);
  };
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
  const canSelectProject =
    status === WorkingProjectStatusValue.Listed ||
    status === WorkingProjectStatusValue.ListingUnavailable ||
    status === WorkingProjectStatusValue.NoProjectSelected ||
    status === WorkingProjectStatusValue.RouteInvalid;
  const isManualEmpty = manualFallback && projects.length === 0;
  const activeLabel = activeProject?.displayName || activeProject?.name;
  const projectHref = activeProject ? getProjectHref?.(activeProject.name) : undefined;

  const submitSelection = async () => {
    if (!selectedProject || (manualFallback && selectedName === activeProject?.name) || selecting) {
      return;
    }
    setSelecting(true);
    setSelectionError(undefined);
    try {
      await selectProject(selectedProject);
      onProjectSelected?.(selectedProject);
      onClose();
    } catch (error) {
      setSelectionError(
        error instanceof Error ? error : new Error('Unable to change project. Try again.'),
      );
    } finally {
      setSelecting(false);
    }
  };

  return (
    <Modal
      variant={
        status === WorkingProjectStatusValue.EmptyList || manualFallback ? 'medium' : 'large'
      }
      isOpen
      onClose={close}
      aria-labelledby={headingId}
      aria-describedby={!manualFallback && canSelectProject ? descriptionId : undefined}
    >
      <ModalHeader
        title={
          status === 'listing-unavailable'
            ? 'Project selector'
            : status === 'empty-list'
            ? WorkingProjectStatusLabelValue[WorkingProjectStatusValue.EmptyList]
            : WorkingProjectSelectorLabelValue.ModalTitle
        }
        labelId={headingId}
        descriptorId={descriptionId}
        description={
          !manualFallback && canSelectProject
            ? 'Choose the project you want to work in.'
            : undefined
        }
      />
      <ModalBody>
        <Stack hasGutter>
          {status === WorkingProjectStatusValue.Loading ? (
            <Content>Loading projects…</Content>
          ) : status === WorkingProjectStatusValue.EmptyList ? (
            emptyListContent
          ) : status === WorkingProjectStatusValue.ProjectSourceError ||
            status === WorkingProjectStatusValue.ProviderAbsent ? (
            <Alert isInline variant="danger" title="Projects unavailable">
              Unable to load projects. Try again later.
            </Alert>
          ) : status === 'listing-unavailable' && projects.length === 0 ? (
            <EmptyState
              headingLevel="h2"
              titleText="Start by adding a project"
              variant="lg"
              icon={manualProjectMode ? EmptyProjectIllustration : undefined}
            >
              <EmptyStateBody>
                Namespace listing is unavailable. Search for a project you have access to by its
                resource name. Projects you add remain visible in this browser until its data is
                cleared.
              </EmptyStateBody>
              <EmptyStateFooter>
                {onAddProject && (
                  <EmptyStateActions>
                    <Button variant="primary" onClick={onAddProject}>
                      Add project
                    </Button>
                  </EmptyStateActions>
                )}
                {manualProjectMode && (
                  <EmptyStateActions>
                    <Button variant="link" onClick={onClose}>
                      Cancel
                    </Button>
                  </EmptyStateActions>
                )}
              </EmptyStateFooter>
            </EmptyState>
          ) : (
            <>
              {activeProject && (
                <StackItem>
                  {manualFallback && (
                    <Flex
                      alignItems={{ default: 'alignItemsCenter' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <Title headingLevel="h2" size="md">
                        Working project
                      </Title>
                      <FieldGroupHelpLabelIcon
                        title="Working project"
                        content="The project used by project-scoped pages. Select another available project to change your working project."
                        buttonTestId="working-project-help"
                      />
                    </Flex>
                  )}
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      {manualFallback ? (
                        activeLabel
                      ) : (
                        <>
                          Current working project: <strong>{activeLabel}</strong>
                        </>
                      )}
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
              {status === 'listing-unavailable' && !manualFallback && (
                <Alert isInline variant="info" title="Project listing unavailable">
                  Only individually validated projects are shown.
                </Alert>
              )}
              <StackItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <Title headingLevel="h2" size={manualFallback ? 'md' : 'lg'}>
                    Available projects
                  </Title>
                  {manualFallback && (
                    <FieldGroupHelpLabelIcon
                      title="Available projects"
                      content="Only projects you have added and that the provider has validated are shown. Use Add project to search for another project by its resource name."
                      buttonTestId="available-projects-help"
                    />
                  )}
                </Flex>
              </StackItem>
              <StackItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'wrap' }}>
                  {(isAiProject || manualFallback) && (
                    <FlexItem>
                      <SimpleSelect
                        ariaLabel="Project type"
                        value={filter}
                        toggleLabel={
                          manualFallback && filter === 'all' ? (
                            <Flex
                              alignItems={{ default: 'alignItemsCenter' }}
                              spaceItems={{ default: 'spaceItemsSm' }}
                            >
                              <FlexItem>All projects</FlexItem>
                              <FlexItem>
                                <Badge
                                  isRead
                                  className="odh-working-project-selector__count"
                                  screenReaderText="projects"
                                >
                                  {projects.length}
                                </Badge>
                              </FlexItem>
                            </Flex>
                          ) : filter === 'ai' ? (
                            filterToggleLabel
                          ) : undefined
                        }
                        onChange={setFilter}
                        options={[
                          ...(isAiProject ? [{ key: 'ai', label: 'AI projects only' }] : []),
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
                    onSelectDataListItem={changeSelectedProject}
                    onSelectableRowChange={changeSelectedProject}
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
                                      {manualFallback ? (
                                        <>
                                          <Content component="p" id={`working-project-${name}`}>
                                            {displayName || name}
                                          </Content>
                                          {displayName && displayName !== name && (
                                            <Content
                                              component="small"
                                              className="pf-v6-u-text-color-subtle"
                                            >
                                              {name}
                                            </Content>
                                          )}
                                        </>
                                      ) : (
                                        <strong id={`working-project-${name}`}>
                                          {displayName || name}
                                        </strong>
                                      )}
                                    </FlexItem>
                                    {isAiProject?.(name) && <FlexItem>{aiLabel}</FlexItem>}
                                  </Flex>
                                  {(manualFallback || getProjectDescription?.(name)) && (
                                    <Content
                                      component="small"
                                      className="pf-v6-u-text-color-subtle"
                                    >
                                      {getProjectDescription?.(name) || 'No description'}
                                    </Content>
                                  )}
                                </Stack>
                              </DataListCell>,
                              <DataListCell
                                key="selection"
                                isFilled={false}
                                isIcon={Boolean(getProjectDescription?.(name))}
                                className="odh-working-project-selector__selection"
                              >
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
      {manualFallback && !isManualEmpty ? (
        <ModalFooter>
          <DashboardModalFooter
            submitLabel="Select"
            isSubmitDisabled={!selectedProject || selectedName === activeProject?.name || selecting}
            isSubmitLoading={selecting}
            isCancelDisabled={selecting}
            onSubmit={submitSelection}
            error={selectionError}
            alertTitle="Unable to change working project"
            secondaryActions={
              onAddProject ? (
                <Button variant="secondary" isDisabled={selecting} onClick={onAddProject}>
                  Add project
                </Button>
              ) : undefined
            }
            onCancel={close}
          />
        </ModalFooter>
      ) : (
        !isManualEmpty && (
          <ModalFooter>
            <Flex
              className="pf-v6-u-w-100"
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
            >
              {onCreateProject && status === 'listed' && (
                <FlexItem>
                  <Button
                    variant="secondary"
                    isDisabled={selecting}
                    onClick={() => {
                      onClose();
                      onCreateProject(false);
                    }}
                  >
                    Create project
                  </Button>
                </FlexItem>
              )}
              {onAddProject && status === 'listing-unavailable' && projects.length > 0 && (
                <FlexItem>
                  <Button variant="secondary" isDisabled={selecting} onClick={onAddProject}>
                    Add project
                  </Button>
                </FlexItem>
              )}
              <FlexItem align={{ default: 'alignRight' }}>
                {canSelectProject ? (
                  <DashboardModalFooter
                    submitLabel="Select"
                    onSubmit={submitSelection}
                    isSubmitDisabled={!selectedProject || selecting}
                    isSubmitLoading={selecting}
                    isCancelDisabled={selecting}
                    error={selectionError}
                    alertTitle="Unable to change working project"
                    onCancel={close}
                  />
                ) : (
                  <Button variant="link" onClick={onClose}>
                    Close
                  </Button>
                )}
              </FlexItem>
            </Flex>
          </ModalFooter>
        )
      )}
    </Modal>
  );
};

export default WorkingProjectSelector;
