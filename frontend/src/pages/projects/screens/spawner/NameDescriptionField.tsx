import * as React from 'react';
import { FormGroup, FormSection, TextInput } from '@patternfly/react-core';
import { SpawnerPageSectionID } from './types';
import { NameDescType } from '../../types';

type NameDescriptionFieldProps = {
  data: NameDescType;
  setData: (nameDesc: NameDescType) => void;
};

const NameDescriptionField: React.FC<NameDescriptionFieldProps> = ({ data, setData }) => {
  return (
    <FormSection id={SpawnerPageSectionID.NAME_DESCRIPTION}>
      <FormGroup label="Name" fieldId="workspace-name">
        <TextInput
          isRequired
          type="text"
          id="workspace-name"
          name="workspace-name"
          value={data.name}
          onChange={(name: string) => setData({ ...data, name })}
        />
      </FormGroup>
      <FormGroup label="Description" fieldId="workspace-description">
        <TextInput
          type="text"
          id="workspace-description"
          name="workspace-description"
          value={data.description}
          onChange={(description: string) => setData({ ...data, description })}
        />
      </FormGroup>
    </FormSection>
  );
};

export default NameDescriptionField;
