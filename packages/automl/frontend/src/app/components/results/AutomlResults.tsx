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
import type { ModelArtifact } from '~/app/types';
import {
  mockBinaryModels,
  mockMulticlassModels,
  mockRegressionModels,
  mockFeatureImportance,
  mockBinaryConfusionMatrix,
  mockMulticlassConfusionMatrix,
} from '~/app/mocks/mockModelArtifact';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';

type TaskTypeSection = {
  label: string;
  models: ModelArtifact[];
};

const TASK_TYPE_SECTIONS: TaskTypeSection[] = [
  { label: 'Binary', models: mockBinaryModels },
  { label: 'Multiclass', models: mockMulticlassModels },
  { label: 'Regression', models: mockRegressionModels },
];

type SelectedModel = {
  model: ModelArtifact;
  index: number;
};

function getMockSupplementaryData(model: ModelArtifact) {
  const taskType = model.context.task_type;

  const confusionMatrixByType: Partial<Record<string, typeof mockBinaryConfusionMatrix>> = {
    binary: mockBinaryConfusionMatrix,
    multiclass: mockMulticlassConfusionMatrix,
  };

  return {
    featureImportance: mockFeatureImportance,
    confusionMatrix: confusionMatrixByType[taskType],
  };
}

function AutomlResults(): React.JSX.Element {
  const [selected, setSelected] = React.useState<SelectedModel | null>(null);
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const supplementaryData = selected ? getMockSupplementaryData(selected.model) : undefined;

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
              setSelected({ model: section.models[index], index });
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
      {selected && supplementaryData && (
        <AutomlModelDetailsModal
          isOpen
          onClose={() => setSelected(null)}
          model={selected.model}
          rank={selected.index + 1}
          createdAt="2026-02-17T12:30:24Z"
          featureImportance={supplementaryData.featureImportance}
          confusionMatrix={supplementaryData.confusionMatrix}
        />
      )}
    </Stack>
  );
}

export default AutomlResults;
