import * as React from 'react';
import { FormGroup, FormSection, TextInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { TrustyDBData } from '#~/concepts/trustyai/types';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import { TRUSTYAI_INSTALL_MODAL_TEST_ID } from '#~/concepts/trustyai/const';
import PasswordInput from '#~/components/PasswordInput';

type TrustyDBSecretFieldsProps = {
  data: TrustyDBData;
  onDataChange: UpdateObjectAtPropAndValue<TrustyDBData>;
};

const TrustyField: React.FC<{
  data: TrustyDBData;
  id: keyof TrustyDBData;
  label: string;
  labelTooltip: string;
  onChange: TrustyDBSecretFieldsProps['onDataChange'];
}> = ({ data, id, label, labelTooltip, onChange }) => {
  const value = data[id];
  const Component = id === 'databasePassword' ? PasswordInput : TextInput;

  return (
    <FormGroup
      label={label}
      labelHelp={<FieldGroupHelpLabelIcon content={labelTooltip} />}
      isRequired
      fieldId={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-${id}`}
    >
      <Component
        data-testid={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-${id}`}
        id={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-${id}`}
        name={`${TRUSTYAI_INSTALL_MODAL_TEST_ID}-${id}`}
        type={id === 'databasePort' ? 'number' : 'text'}
        isRequired
        value={value}
        onChange={(event, newValue) => {
          onChange(id, newValue);
        }}
      />
    </FormGroup>
  );
};

const TrustyDBSecretFields: React.FC<TrustyDBSecretFieldsProps> = ({ data, onDataChange }) => (
  <FormSection>
    <TrustyField
      data={data}
      label="Database kind"
      id="databaseKind"
      labelTooltip="The kind of database that will be used."
      onChange={onDataChange}
    />
    <TrustyField
      label="Database username"
      data={data}
      id="databaseUsername"
      labelTooltip="The username that TrustyAI should use when connecting to the database."
      onChange={onDataChange}
    />
    <TrustyField
      label="Database password"
      data={data}
      id="databasePassword"
      labelTooltip="The password that TrustyAI should use when connecting to the database."
      onChange={onDataChange}
    />
    <TrustyField
      label="Database service"
      data={data}
      id="databaseService"
      labelTooltip="The Kubernetes service that TrustyAI should use when connecting to the database."
      onChange={onDataChange}
    />
    <TrustyField
      label="Database port"
      data={data}
      id="databasePort"
      labelTooltip="The port that TrustyAI should use when connecting to the database."
      onChange={onDataChange}
    />
    <TrustyField
      label="Database name"
      data={data}
      id="databaseName"
      labelTooltip="The specific database name that TrustyAI should read and write to on the database server."
      onChange={onDataChange}
    />
    <TrustyField
      label="Database generation"
      data={data}
      id="databaseGeneration"
      labelTooltip="The database schema generation strategy to be used by TrustyAI."
      onChange={onDataChange}
    />
  </FormSection>
);

export default TrustyDBSecretFields;
