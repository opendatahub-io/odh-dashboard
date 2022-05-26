import * as React from 'react';
import { Tr, Td } from '@patternfly/react-table';
import { Button, TextInput } from '@patternfly/react-core';
import { PencilAltIcon, TimesIcon, CheckIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { NotebookPackage } from '../../types';

interface EditStepTableRowProps {
  notebookPackage: NotebookPackage;
  setEditedValues: (values: NotebookPackage) => void;
  onDeleteHandler: () => void;
}

export const EditStepTableRow: React.FunctionComponent<EditStepTableRowProps> = ({
  notebookPackage,
  setEditedValues,
  onDeleteHandler,
}) => {
  const [modifiedValue, setModifiedValue] = React.useState<NotebookPackage>(notebookPackage);
  const [isEditMode, setIsEditMode] = React.useState(false);

  return (
    <Tr key={notebookPackage.name}>
      <Td dataLabel={notebookPackage.name}>
        {isEditMode ? (
          <TextInput
            id="software-package-input"
            type="text"
            value={modifiedValue.name}
            onChange={(value) => {
              setModifiedValue({
                name: value,
                version: modifiedValue.version,
                visible: modifiedValue.visible,
              });
            }}
          />
        ) : (
          notebookPackage.name
        )}
      </Td>
      <Td dataLabel={notebookPackage.version}>
        {isEditMode ? (
          <TextInput
            id="version-input"
            type="text"
            value={modifiedValue.version}
            onChange={(value) => {
              setModifiedValue({
                name: modifiedValue.name,
                version: value,
                visible: modifiedValue.visible,
              });
            }}
          />
        ) : (
          notebookPackage.version
        )}
      </Td>
      <Td modifier="nowrap">
        {!isEditMode ? (
          <Button
            id="edit-package-software-button"
            variant="plain"
            icon={<PencilAltIcon />}
            iconPosition="right"
            onClick={() => {
              setModifiedValue(notebookPackage);
              setIsEditMode(true);
            }}
          />
        ) : (
          <>
            <Button
              id="save-package-software-button"
              variant="plain"
              icon={<CheckIcon />}
              onClick={() => {
                setEditedValues(modifiedValue);
                setIsEditMode(false);
              }}
            />
            <Button
              id="cancel-package-software-modifications-button"
              variant="plain"
              icon={<TimesIcon />}
              onClick={() => {
                setEditedValues(notebookPackage);
                setIsEditMode(false);
              }}
            />
          </>
        )}
        <Button
          id="delete-package-software-button"
          variant="plain"
          icon={<MinusCircleIcon />}
          onClick={() => {
            onDeleteHandler();
            setIsEditMode(false);
          }}
        />
      </Td>
    </Tr>
  );
};
