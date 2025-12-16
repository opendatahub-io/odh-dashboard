import * as React from 'react';
import { FormSection, Stack, StackItem, FormGroup, FormHelperText } from '@patternfly/react-core';
import { SpawnerPageSectionTitles } from '#~/pages/projects/screens/spawner/const';
import { SpawnerPageSectionID } from '#~/pages/projects/screens/spawner/types';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import FeatureStoreSelector, { WorkbenchFeatureStoreConfig } from './FeatureStoreSelector';
import FeatureStoreCodeBlock from './FeatureStoreCodeBlock';
import {
  FEATURE_STORE_CODE_HELP,
  FEATURE_STORE_CODE_DESCRIPTION,
  generateFeatureStoreCode,
} from './utils';

type FeatureStoreFormSectionProps = {
  selectedFeatureStores?: WorkbenchFeatureStoreConfig[];
  onSelect: (featureStores: WorkbenchFeatureStoreConfig[]) => void;
  availableFeatureStores: WorkbenchFeatureStoreConfig[];
  loaded: boolean;
  error?: Error;
};

export const FeatureStoreFormSection: React.FC<FeatureStoreFormSectionProps> = ({
  selectedFeatureStores = [],
  onSelect,
  availableFeatureStores,
  loaded,
  error,
}) => {
  const featureStoreStatus = useIsAreaAvailable(SupportedArea.FEATURE_STORE);
  const isFeastOperatorAvailable = featureStoreStatus.status;

  const codeContent = React.useMemo(() => generateFeatureStoreCode(), []);
  const hasSelectedFeatureStores = selectedFeatureStores.length > 0;

  if (!isFeastOperatorAvailable) {
    return null;
  }

  return (
    <FormSection
      title={SpawnerPageSectionTitles[SpawnerPageSectionID.FEATURE_STORE]}
      id={SpawnerPageSectionID.FEATURE_STORE}
      aria-label={SpawnerPageSectionTitles[SpawnerPageSectionID.FEATURE_STORE]}
    >
      <Stack hasGutter>
        <StackItem>
          <FeatureStoreSelector
            selectedFeatureStores={selectedFeatureStores}
            onSelect={onSelect}
            availableFeatureStores={availableFeatureStores}
            loaded={loaded}
            error={error}
          />
        </StackItem>
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
    </FormSection>
  );
};
