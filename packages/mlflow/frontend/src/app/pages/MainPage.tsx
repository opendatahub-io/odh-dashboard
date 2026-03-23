// This page is a temporary placeholder used only to verify BFF connectivity during development.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  MenuToggle,
  MenuToggleElement,
  Popover,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useNamespaceSelector } from 'mod-arch-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import {
  MlflowExperimentSelector,
  type MlflowExperiment,
  type MlflowSelectorStatus,
} from '@odh-dashboard/internal/concepts/mlflow';
import { WORKSPACE_PARAM } from '~/app/utilities/const';

const BffConnectionAlert: React.FC<{ selectorStatus: MlflowSelectorStatus }> = ({
  selectorStatus,
}) => {
  let alertVariant: React.ComponentProps<typeof Alert>['variant'] = 'success';
  let alertTitle = 'BFF connected';
  if (!selectorStatus.loaded) {
    alertVariant = 'info';
    alertTitle = 'Checking BFF connectivity...';
  } else if (selectorStatus.error) {
    alertVariant = 'danger';
    alertTitle = 'Could not connect to BFF';
  }

  return <Alert variant={alertVariant} isInline isPlain title={alertTitle} />;
};

const MainPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<MlflowExperiment | undefined>();
  const [selectorStatus, setSelectorStatus] = useState<MlflowSelectorStatus>({
    loaded: false,
  });
  const [filterInput, setFilterInput] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { namespaces, preferredNamespace, updatePreferredNamespace, namespacesLoaded } =
    useNamespaceSelector();

  const excludedNames = new Set(['default', 'system', 'openshift', 'opendatahub']);
  const filteredNamespaces = namespaces.filter(
    (ns) =>
      !ns.name.startsWith('openshift-') &&
      !ns.name.startsWith('kube-') &&
      !excludedNames.has(ns.name),
  );

  const workspace =
    searchParams.get(WORKSPACE_PARAM) ||
    preferredNamespace?.name ||
    filteredNamespaces[0]?.name ||
    '';
  const filter = appliedFilter || undefined;
  const setWorkspaceSearchParam = React.useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(WORKSPACE_PARAM, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!workspace || searchParams.get(WORKSPACE_PARAM) === workspace) {
      return;
    }
    setWorkspaceSearchParam(workspace);
  }, [workspace, searchParams, setWorkspaceSearchParam]);

  useEffect(() => {
    setSelectedExperiment(undefined);
    setSelectorStatus({ loaded: false, error: undefined });
  }, [workspace, appliedFilter]);

  const projectToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((prev) => !prev)}
        isExpanded={isOpen}
        isDisabled={!namespacesLoaded || filteredNamespaces.length === 0}
        style={{ minWidth: '250px' }}
      >
        {workspace || 'Select project'}
      </MenuToggle>
    ),
    [isOpen, namespacesLoaded, filteredNamespaces.length, workspace],
  );

  const onProjectSelect = (
    _event: React.MouseEvent<Element> | undefined,
    value: string | number | undefined,
  ) => {
    if (value) {
      const selected = String(value);
      const match = filteredNamespaces.find((n) => n.name === selected);
      if (match) {
        updatePreferredNamespace(match);
      }
      setWorkspaceSearchParam(selected);
    }
    setIsOpen(false);
  };

  return (
    <ApplicationsPage
      title="MLflow"
      description="MLflow Experiment Tracking"
      empty={false}
      loaded
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <Stack hasGutter>
        <StackItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem>Project</FlexItem>
            <FlexItem>
              <Select
                isOpen={isOpen}
                selected={workspace}
                onSelect={onProjectSelect}
                onOpenChange={(open) => setIsOpen(open)}
                isScrollable
                toggle={projectToggle}
              >
                <SelectList>
                  {filteredNamespaces.map((ns) => (
                    <SelectOption key={ns.name} value={ns.name} isSelected={ns.name === workspace}>
                      {ns.name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FlexItem>
          </Flex>
        </StackItem>
        {workspace && (
          <>
            <StackItem>
              <BffConnectionAlert selectorStatus={selectorStatus} />
            </StackItem>
            <StackItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  Filter{' '}
                  <Popover
                    headerContent="MLflow filter syntax"
                    bodyContent={
                      <Stack hasGutter>
                        <StackItem>
                          Uses SQL-like expressions. Multiple clauses joined with AND.
                        </StackItem>
                        <StackItem>
                          <strong>By name</strong>
                          <br />
                          name = &apos;my-experiment&apos;
                          <br />
                          name LIKE &apos;%training%&apos;
                        </StackItem>
                        <StackItem>
                          <strong>By tag</strong>
                          <br />
                          tags.team = &apos;ml-platform&apos;
                          <br />
                          tags.env = &apos;prod&apos;
                        </StackItem>
                        <StackItem>
                          <strong>Combined</strong>
                          <br />
                          name LIKE &apos;%train%&apos; AND tags.team = &apos;ml-platform&apos;
                        </StackItem>
                      </Stack>
                    }
                  >
                    <DashboardPopupIconButton
                      icon={<OutlinedQuestionCircleIcon />}
                      aria-label="MLflow filter help"
                    />
                  </Popover>
                </FlexItem>
                <FlexItem style={{ width: '400px' }}>
                  <TextInput
                    aria-label="Experiment filter"
                    placeholder="e.g. tags.team = 'ml-platform'"
                    value={filterInput}
                    onChange={(_e, value) => {
                      setFilterInput(value);
                      if (!value.trim()) {
                        setAppliedFilter('');
                      }
                    }}
                  />
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    isDisabled={filterInput.trim() === appliedFilter}
                    onClick={() => setAppliedFilter(filterInput.trim())}
                  >
                    Apply
                  </Button>
                </FlexItem>
              </Flex>
            </StackItem>
            <StackItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>Experiment</FlexItem>
                <FlexItem style={{ width: '500px' }}>
                  <MlflowExperimentSelector
                    workspace={workspace}
                    filter={filter}
                    selection={selectedExperiment?.name}
                    onSelect={setSelectedExperiment}
                    onStatusChange={setSelectorStatus}
                  />
                </FlexItem>
              </Flex>
            </StackItem>
          </>
        )}
      </Stack>
    </ApplicationsPage>
  );
};

export default MainPage;
