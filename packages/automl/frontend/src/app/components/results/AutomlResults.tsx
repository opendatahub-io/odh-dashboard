import React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import type { ModelArtifact, FeatureImportanceData, ConfusionMatrixData } from '~/app/types';
import {
  mockBinaryModels,
  mockMulticlassModels,
  mockRegressionModels,
  mockBinaryFeatureImportances,
  mockMulticlassFeatureImportances,
  mockRegressionFeatureImportances,
  mockBinaryConfusionMatrices,
  mockMulticlassConfusionMatrices,
} from '~/app/mocks/mockModelArtifact';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';

type TaskTypeSection = {
  label: string;
  models: ModelArtifact[];
  featureImportances: FeatureImportanceData[];
  confusionMatrices?: ConfusionMatrixData[];
};

const TASK_TYPE_SECTIONS: TaskTypeSection[] = [
  {
    label: 'Binary',
    models: mockBinaryModels,
    featureImportances: mockBinaryFeatureImportances,
    confusionMatrices: mockBinaryConfusionMatrices,
  },
  {
    label: 'Multiclass',
    models: mockMulticlassModels,
    featureImportances: mockMulticlassFeatureImportances,
    confusionMatrices: mockMulticlassConfusionMatrices,
  },
  {
    label: 'Regression',
    models: mockRegressionModels,
    featureImportances: mockRegressionFeatureImportances,
  },
];

type ModalState = {
  section: TaskTypeSection;
  selectedIndex: number;
};

function AutomlResults(): React.JSX.Element {
  const [modalState, setModalState] = React.useState<ModalState | null>(null);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  return (
    <Stack hasGutter>
      {TASK_TYPE_SECTIONS.map((section) => (
        <StackItem key={section.label}>
          <Title headingLevel="h3" className="pf-v6-u-mb-sm">
            {section.label}
          </Title>
          <Dropdown
            isOpen={openDropdown === section.label}
            onSelect={(_e, value) => {
              const index = Number(value);
              setModalState({ section, selectedIndex: index });
              setOpenDropdown(null);
            }}
            onOpenChange={(isOpen) => setOpenDropdown(isOpen ? section.label : null)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() =>
                  setOpenDropdown(openDropdown === section.label ? null : section.label)
                }
                isExpanded={openDropdown === section.label}
                data-testid={`${section.label.toLowerCase()}-model-selector`}
              >
                Select a model
              </MenuToggle>
            )}
          >
            <DropdownList>
              {section.models.map((model, i) => (
                <DropdownItem key={model.display_name} value={i}>
                  #{i + 1} {model.display_name}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        </StackItem>
      ))}
      {modalState && (
        <AutomlModelDetailsModal
          isOpen
          onClose={() => setModalState(null)}
          models={modalState.section.models}
          selectedIndex={modalState.selectedIndex}
          onSelectModel={(index) => setModalState({ ...modalState, selectedIndex: index })}
          createdAt="2026-02-17T12:30:24Z"
          featureImportance={modalState.section.featureImportances[modalState.selectedIndex]}
          confusionMatrix={modalState.section.confusionMatrices?.[modalState.selectedIndex]}
        />
      )}
    </Stack>
  );
}

export default AutomlResults;
