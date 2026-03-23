import React from 'react';
import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { mockMulticlassContext } from '~/app/mocks/mockAutomlResultsContext';
import { computeRankMap } from '~/app/utilities/utils';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';

type ModalState = {
  modelName: string;
  rank: number;
};

function AutomlResults(): React.JSX.Element {
  const [modalState, setModalState] = React.useState<ModalState | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const { models, parameters } = mockMulticlassContext;
  const rankMap = React.useMemo(
    () => computeRankMap(models, parameters.task_type),
    [models, parameters.task_type],
  );
  const modelsArray = Object.values(models);

  return (
    <div>
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
        />
      )}
    </div>
  );
}

export default AutomlResults;
