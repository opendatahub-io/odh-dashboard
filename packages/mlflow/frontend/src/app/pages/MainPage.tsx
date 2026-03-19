// This page is a temporary placeholder used only to verify BFF connectivity during development.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Flex,
  FlexItem,
  List,
  ListItem,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { URL_PREFIX, BFF_API_VERSION, WORKSPACE_PARAM } from '~/app/utilities/const';

interface Experiment {
  name: string;
}

const MainPage: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadError, setLoadError] = useState<Error | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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

  useEffect(() => {
    if (!workspace || searchParams.get(WORKSPACE_PARAM) === workspace) {
      return;
    }
    setSearchParams({ [WORKSPACE_PARAM]: workspace }, { replace: true });
  }, [workspace, searchParams, setSearchParams]);

  useEffect(() => {
    if (!workspace) {
      return;
    }
    const controller = new AbortController();
    setLoaded(false);
    setLoadError(undefined);

    fetch(
      `${URL_PREFIX}/api/${BFF_API_VERSION}/experiments?${WORKSPACE_PARAM}=${encodeURIComponent(workspace)}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`BFF responded with ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        setExperiments(json?.data?.experiments ?? []);
        setLoaded(true);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setLoadError(err instanceof Error ? err : new Error(String(err)));
        setLoaded(true);
      });

    return () => controller.abort();
  }, [workspace]);

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
      setSearchParams({ [WORKSPACE_PARAM]: selected }, { replace: true });
    }
    setIsOpen(false);
  };

  return (
    <ApplicationsPage
      title="MLflow"
      description="MLflow Experiment Tracking"
      empty={false}
      loadError={loadError}
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
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsOpen(!isOpen)}
                    isExpanded={isOpen}
                    isDisabled={!namespacesLoaded || filteredNamespaces.length === 0}
                    style={{ minWidth: '250px' }}
                  >
                    {workspace || 'Select project'}
                  </MenuToggle>
                )}
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
        {loaded && !loadError && workspace && (
          <>
            <StackItem>
              <Alert
                variant="success"
                isInline
                isPlain
                title={`BFF connected — ${experiments.length} experiment${experiments.length !== 1 ? 's' : ''} found`}
              />
            </StackItem>
            {experiments.length > 0 && (
              <StackItem>
                <List>
                  {experiments.map((exp) => (
                    <ListItem key={exp.name}>{exp.name}</ListItem>
                  ))}
                </List>
              </StackItem>
            )}
          </>
        )}
      </Stack>
    </ApplicationsPage>
  );
};

export default MainPage;
