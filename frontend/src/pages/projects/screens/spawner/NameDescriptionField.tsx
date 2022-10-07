import * as React from 'react';
import { FormGroup, FormSection, TextInput } from '@patternfly/react-core';
import { SpawnerPageSectionID } from './types';
import { NameDescType } from '../../types';

type NameDescriptionFieldProps = {
  nameDesc: NameDescType;
  setNameDesc: (nameDesc: NameDescType) => void;
};

const NameDescriptionField: React.FC<NameDescriptionFieldProps> = ({ nameDesc, setNameDesc }) => {
  return (
    <FormSection id={SpawnerPageSectionID.NAME_DESCRIPTION}>
      <FormGroup label="Name" fieldId="workspace-name">
        <TextInput
          isRequired
          type="text"
          id="workspace-name"
          name="workspace-name"
          value={nameDesc.name}
          onChange={(name: string) => setNameDesc({ ...nameDesc, name })}
        />
      </FormGroup>
      <FormGroup label="Description" fieldId="workspace-description">
        <TextInput
          type="text"
          id="workspace-description"
          name="workspace-description"
          value={nameDesc.description}
          onChange={(description: string) => setNameDesc({ ...nameDesc, description })}
        />
      </FormGroup>
    </FormSection>
  );
};

export default NameDescriptionField;
