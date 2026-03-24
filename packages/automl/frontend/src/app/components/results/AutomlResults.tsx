import React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import {
  mockTabularContext,
  mockTimeseriesContext,
  type MockAutomlResultsContext,
} from '~/app/mocks/mockAutomlResultsContext';

import { computeRankMap } from '~/app/utilities/utils';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';

type ModalState = {
  modelName: string;
  rank: number;
};

const MOCK_CONTEXTS: Record<string, MockAutomlResultsContext> = {
  tabular: mockTabularContext,
  timeseries: mockTimeseriesContext,
};

function AutomlResults(): React.JSX.Element {
  const [modalState, setModalState] = React.useState<ModalState | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [activeContext, setActiveContext] = React.useState<string>('tabular');

  const context = MOCK_CONTEXTS[activeContext];
  const { models, parameters } = context;
  const rankMap = React.useMemo(
    () => computeRankMap(models, parameters.task_type),
    [models, parameters.task_type],
  );
  const modelsArray = Object.values(models);

  return (
    <div>
      <ToggleGroup aria-label="Mock context toggle" data-testid="context-toggle">
        <ToggleGroupItem
          text="Tabular"
          isSelected={activeContext === 'tabular'}
          onChange={() => {
            setActiveContext('tabular');
            setModalState(null);
          }}
          data-testid="toggle-tabular"
        />
        <ToggleGroupItem
          text="Timeseries"
          isSelected={activeContext === 'timeseries'}
          onChange={() => {
            setActiveContext('timeseries');
            setModalState(null);
          }}
          data-testid="toggle-timeseries"
        />
      </ToggleGroup>
      <Dropdown
        isOpen={isDropdownOpen}
        onSelect={(_e, value) => {
          const name = String(value);
          setModalState({
            modelName: name,
            rank: rankMap[name],
          });
          setIsDropdownOpen(false);
        }}
        onOpenChange={setIsDropdownOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            isExpanded={isDropdownOpen}
            data-testid="model-selector"
          >
            Select a model
          </MenuToggle>
        )}
      >
        <DropdownList>
          {modelsArray.map((model) => (
            <DropdownItem key={model.display_name} value={model.display_name}>
              #{rankMap[model.display_name]} {model.display_name}
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
      {modalState && (
        <AutomlModelDetailsModal
          isOpen
          onClose={() => setModalState(null)}
          modelName={modalState.modelName}
          rank={modalState.rank}
          // TODO: Remove taskType prop when integrating with AutomlResultsContext
          taskType={parameters.task_type}
        />
      )}
    </div>
  );
}

export default AutomlResults;
