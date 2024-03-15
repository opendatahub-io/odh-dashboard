import * as React from 'react';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { ActionList, ActionListItem, Button, TextInput } from '@patternfly/react-core';
import { CheckIcon, MinusCircleIcon, PencilAltIcon, TimesIcon } from '@patternfly/react-icons';
import { BYONImagePackage } from '~/types';
import { DisplayedContentTab } from './ManageBYONImageModal';

type DisplayedContentTableRowProps = {
  tabKey: DisplayedContentTab;
  obj: BYONImagePackage;
  isActive: boolean;
  isEditing: boolean;
  onConfirm: (name: string, version: string) => void;
  onReset: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveToNextRow: () => void;
};

const DisplayedContentTableRow: React.FC<DisplayedContentTableRowProps> = ({
  tabKey,
  obj,
  isActive,
  isEditing,
  onConfirm,
  onReset,
  onEdit,
  onDelete,
  onMoveToNextRow,
}) => {
  const [name, setName] = React.useState(obj.name);
  const [version, setVersion] = React.useState(obj.version);

  const dataLabel = tabKey === DisplayedContentTab.SOFTWARE ? 'Software' : 'Packages';

  const resetAll = React.useCallback(() => {
    onReset();
    setName(obj.name);
    setVersion(obj.version);
  }, [onReset, obj]);

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        onConfirm(name, version);
        onMoveToNextRow();
      }
      if (event.key === 'Escape') {
        resetAll();
      }
    },
    [name, onConfirm, onMoveToNextRow, version, resetAll],
  );

  return (
    <Tbody>
      <Tr>
        <Td dataLabel={dataLabel}>
          {isActive ? (
            <TextInput
              aria-label={`${dataLabel} name input`}
              data-testid={`${dataLabel}-name-input`}
              value={name}
              onChange={(e, value) => setName(value)}
              onKeyDown={onKeyDown}
              autoFocus
            />
          ) : (
            obj.name
          )}
        </Td>
        <Td dataLabel="Version">
          {isActive ? (
            <TextInput
              aria-label={`${dataLabel} version input`}
              data-testid={`${dataLabel}-version-input`}
              value={version}
              onChange={(e, value) => setVersion(value)}
              onKeyDown={onKeyDown}
            />
          ) : (
            obj.version
          )}
        </Td>
        <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
          <ActionList isIconList>
            {isActive ? (
              <>
                <ActionListItem>
                  <Button
                    data-testid={`save-displayed-button-${dataLabel} `}
                    aria-label="Save displayed content"
                    variant="link"
                    onClick={() => onConfirm(name, version)}
                  >
                    <CheckIcon />
                  </Button>
                </ActionListItem>
                <ActionListItem>
                  <Button
                    data-testid={`discard-display-button-${dataLabel} `}
                    aria-label="Discard displayed content"
                    variant="plain"
                    onClick={resetAll}
                  >
                    <TimesIcon />
                  </Button>
                </ActionListItem>
              </>
            ) : (
              <>
                <ActionListItem>
                  <Button
                    aria-label="Edit displayed content"
                    isDisabled={isEditing}
                    variant="plain"
                    onClick={onEdit}
                  >
                    <PencilAltIcon />
                  </Button>
                </ActionListItem>
                <ActionListItem>
                  <Button
                    data-testid="remove-displayed-content-button"
                    aria-label="Remove displayed content"
                    isDisabled={isEditing}
                    variant="plain"
                    onClick={onDelete}
                  >
                    <MinusCircleIcon />
                  </Button>
                </ActionListItem>
              </>
            )}
          </ActionList>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default DisplayedContentTableRow;
