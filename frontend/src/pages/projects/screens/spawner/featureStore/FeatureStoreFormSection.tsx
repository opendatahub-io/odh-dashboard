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
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import ExtendedButton from '#~/components/ExtendedButton';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { SpawnerPageSectionTitles } from '#~/pages/projects/screens/spawner/const';
import { SpawnerPageSectionID } from '#~/pages/projects/screens/spawner/types';
import type {
  WorkbenchFeatureStoreConfig,
  SelectedFeatureStoreConfig,
} from './useWorkbenchFeatureStores';
import FeatureStoreCodeBlock from './FeatureStoreCodeBlock';
import { SelectFeatureStoresModal } from './SelectFeatureStoresModal';
import { FeatureStoreConnectedTable } from './FeatureStoreConnectedTable';
import {
  FEATURE_STORE_CODE_HELP,
  FEATURE_STORE_CODE_DESCRIPTION,
  FEATURE_STORE_EMPTY_STATE_BODY,
  FEATURE_STORE_EMPTY_STATE_TITLE,
  generateFeatureStoreCode,
  removeFeatureStoreProjectById,
} from './utils';

type FeatureStoreFormSectionProps = {
  selectedFeatureStores?: SelectedFeatureStoreConfig[];
  availableFeatureStores?: WorkbenchFeatureStoreConfig[];
  loaded?: boolean;
  error?: Error;
  onSelect: (featureStores: SelectedFeatureStoreConfig[]) => void;
};

export const FeatureStoreFormSection: React.FC<FeatureStoreFormSectionProps> = ({
  selectedFeatureStores = [],
  availableFeatureStores = [],
  loaded = false,
  error,
  onSelect,
}) => {
  const featureStoreStatus = useIsAreaAvailable(SupportedArea.FEATURE_STORE);
  const isFeastOperatorAvailable = featureStoreStatus.status;

  const [showSelectModal, setShowSelectModal] = React.useState(false);

  const unavailableStoresRef = React.useRef<SelectedFeatureStoreConfig[]>([]);
  if (
    unavailableStoresRef.current.length === 0 &&
    selectedFeatureStores.some((fs) => fs.isUnavailable)
  ) {
    unavailableStoresRef.current = selectedFeatureStores.filter((fs) => fs.isUnavailable);
  }

  const codeContent = React.useMemo(() => generateFeatureStoreCode(), []);
  const hasSelectedFeatureStores = selectedFeatureStores.length > 0;

  if (!isFeastOperatorAvailable) {
    return null;
  }

  return (
    <FormSection
      data-testid="feature-store-section"
      title={
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem>
            {SpawnerPageSectionTitles[SpawnerPageSectionID.FEATURE_STORE]}
            {hasSelectedFeatureStores && (
              <DashboardHelpTooltip content={FEATURE_STORE_EMPTY_STATE_BODY} />
            )}
          </FlexItem>
          <FlexItem>
            <ExtendedButton
              variant="secondary"
              data-testid="select-feature-store-button"
              onClick={() => setShowSelectModal(true)}
              loadProps={{
                loaded: loaded || !!error,
                error,
              }}
              tooltipProps={{
                isEnabled: loaded && availableFeatureStores.length === 0,
                content: 'No feature stores available',
              }}
            >
              Select feature stores
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
              featureStores={selectedFeatureStores}
              availabilityLoaded={loaded}
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
          featureStores={availableFeatureStores}
          unavailableFeatureStores={unavailableStoresRef.current}
          initialSelections={selectedFeatureStores}
          onSave={(featureStores) => {
            onSelect(featureStores);
            setShowSelectModal(false);
          }}
          onClose={() => setShowSelectModal(false)}
        />
      )}
    </FormSection>
  );
};
