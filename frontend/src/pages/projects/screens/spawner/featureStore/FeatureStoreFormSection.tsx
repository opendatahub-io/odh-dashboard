import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  FormSection,
  Stack,
  StackItem,
  FormGroup,
  FormHelperText,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ExtendedButton from '#~/components/ExtendedButton';
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import { SpawnerPageSectionTitles } from '#~/pages/projects/screens/spawner/const';
import { SpawnerPageSectionID } from '#~/pages/projects/screens/spawner/types';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import type { WorkbenchFeatureStoreConfig } from './useWorkbenchFeatureStores';
import FeatureStoreCodeBlock from './FeatureStoreCodeBlock';
import { SelectFeatureStoresModal } from './SelectFeatureStoresModal';
import { FeatureStoreConnectedTable } from './FeatureStoreConnectedTable';
import { useFeatureStoreProjects } from './useFeatureStoreProjects';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';
import {
  FEATURE_STORE_CODE_HELP,
  FEATURE_STORE_CODE_DESCRIPTION,
  FEATURE_STORE_EMPTY_STATE_BODY,
  FEATURE_STORE_EMPTY_STATE_TITLE,
  generateFeatureStoreCode,
  mapConfigsToFeatureStoreProjects,
  mapFeatureStoreProjectsToConfigs,
  removeFeatureStoreProjectById,
} from './utils';

type FeatureStoreFormSectionProps = {
  selectedFeatureStores?: WorkbenchFeatureStoreConfig[];
  availableFeatureStores?: WorkbenchFeatureStoreConfig[];
  onSelect: (featureStores: WorkbenchFeatureStoreConfig[]) => void;
};

export const FeatureStoreFormSection: React.FC<FeatureStoreFormSectionProps> = ({
  selectedFeatureStores = [],
  availableFeatureStores = [],
  onSelect,
}) => {
  const featureStoreStatus = useIsAreaAvailable(SupportedArea.FEATURE_STORE);
  const isFeastOperatorAvailable = featureStoreStatus.status;

  const {
    featureStoreProjects,
    loaded: projectsLoaded,
    error: projectsError,
  } = useFeatureStoreProjects();

  const [showSelectModal, setShowSelectModal] = React.useState(false);

  const codeContent = React.useMemo(() => generateFeatureStoreCode(), []);
  const hasSelectedFeatureStores = selectedFeatureStores.length > 0;

  const selectedProjects = React.useMemo(
    () => mapConfigsToFeatureStoreProjects(selectedFeatureStores, featureStoreProjects),
    [featureStoreProjects, selectedFeatureStores],
  );

  const alreadySelectedIds = React.useMemo(
    () => selectedFeatureStores.map(getFeatureStoreProjectId),
    [selectedFeatureStores],
  );

  const selectableProjectCount = React.useMemo(
    () =>
      featureStoreProjects.filter(
        (project) => !alreadySelectedIds.includes(getFeatureStoreProjectId(project)),
      ).length,
    [alreadySelectedIds, featureStoreProjects],
  );

  if (!isFeastOperatorAvailable) {
    return null;
  }

  return (
    <FormSection
      data-testid="feature-store-section"
      title={
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem>{SpawnerPageSectionTitles[SpawnerPageSectionID.FEATURE_STORE]}</FlexItem>
          <FlexItem>
            <ExtendedButton
              variant="secondary"
              data-testid="select-feature-store-button"
              onClick={() => setShowSelectModal(true)}
              loadProps={{
                loaded: projectsLoaded || !!projectsError,
                error: projectsError,
              }}
              tooltipProps={{
                isEnabled: projectsLoaded && selectableProjectCount === 0,
                content: 'No feature stores available',
              }}
            >
              Select feature store
            </ExtendedButton>
          </FlexItem>
        </Flex>
      }
      id={SpawnerPageSectionID.FEATURE_STORE}
      aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.FEATURE_STORE]}
    >
      <Stack hasGutter>
        {hasSelectedFeatureStores ? (
          <StackItem>
            <FeatureStoreConnectedTable
              projects={selectedProjects}
              onRemove={(projectId) => {
                onSelect(removeFeatureStoreProjectById(selectedFeatureStores, projectId));
              }}
            />
          </StackItem>
        ) : (
          <StackItem>
            <Bullseye>
              <EmptyState
                data-testid="feature-store-empty-state"
                headingLevel="h2"
                icon={PlusCircleIcon}
                titleText={FEATURE_STORE_EMPTY_STATE_TITLE}
              >
                <EmptyStateBody>{FEATURE_STORE_EMPTY_STATE_BODY}</EmptyStateBody>
              </EmptyState>
            </Bullseye>
          </StackItem>
        )}
        {hasSelectedFeatureStores && codeContent && (
          <StackItem>
            <FormGroup
              label="Example code"
              fieldId="feature-store-code-example"
              labelHelp={<DashboardHelpTooltip content={FEATURE_STORE_CODE_HELP} />}
            >
              <FormHelperText>
                {FEATURE_STORE_CODE_DESCRIPTION} <strong>Edit workbench form</strong>.
              </FormHelperText>
              <FeatureStoreCodeBlock
                id="feature-store-code-example"
                content={codeContent}
                testId="feature-store-code-block"
              />
            </FormGroup>
          </StackItem>
        )}
      </Stack>
      {showSelectModal && (
        <SelectFeatureStoresModal
          featureStoreProjects={featureStoreProjects}
          alreadySelectedIds={alreadySelectedIds}
          onSave={(projects) => {
            const newConfigs = mapFeatureStoreProjectsToConfigs(projects, availableFeatureStores);
            onSelect([...selectedFeatureStores, ...newConfigs]);
            setShowSelectModal(false);
          }}
          onClose={() => setShowSelectModal(false)}
        />
      )}
    </FormSection>
  );
};
