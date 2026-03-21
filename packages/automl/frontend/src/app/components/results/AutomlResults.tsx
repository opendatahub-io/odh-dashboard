import React from 'react';
import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { mockMulticlassContext } from '~/app/mocks/mockAutomlResultsContext';
import AutomlModelDetailsModal from './AutomlModelDetailsModal/AutomlModelDetailsModal';

type ModalState = {
  modelName: string;
  rank: number;
};

function AutomlResults(): React.JSX.Element {
  const [modalState, setModalState] = React.useState<ModalState | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const modelsArray = Object.values(mockMulticlassContext.models);

  return (
    <div>
      <Dropdown
        isOpen={isDropdownOpen}
        onSelect={(_e, value) => {
          const index = Number(value);
          setModalState({
            modelName: modelsArray[index].display_name,
            rank: index + 1,
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
          {modelsArray.map((model, i) => (
            <DropdownItem key={model.display_name} value={i}>
              #{i + 1} {model.display_name}
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
