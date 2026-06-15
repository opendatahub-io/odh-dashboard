import * as React from 'react';
import { Content, Form, FormGroup, TextArea, Title } from '@patternfly/react-core';
import K8sNameDescriptionField from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { UseK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import RoleLabelsSection from './RoleLabelsSection';
import PermissionRulesSection from './PermissionRulesSection';
import type { LabelEntry, RuleEntry } from './types';

type CreateRoleFormProps = {
  nameDescriptionData: UseK8sNameDescriptionFieldData;
  description: string;
  onDescriptionChange: (value: string) => void;
  labels: LabelEntry[];
  onLabelsChange: (labels: LabelEntry[]) => void;
  rules: RuleEntry[];
  onRulesChange: (rules: RuleEntry[]) => void;
};

const CreateRoleForm: React.FC<CreateRoleFormProps> = ({
  nameDescriptionData,
  description,
  onDescriptionChange,
  labels,
  onLabelsChange,
  rules,
  onRulesChange,
}) => {
  const handleDescriptionChange = React.useCallback(
    (_event: React.FormEvent<HTMLTextAreaElement>, value: string) => {
      onDescriptionChange(value);
    },
    [onDescriptionChange],
  );

  return (
    <Form data-testid="create-role-form">
      <Title headingLevel="h2" size="md">
        Role configuration
      </Title>
      <Content component="p">
        Define the basic properties for this custom role, including its name, description, and
        labels.
      </Content>

      <K8sNameDescriptionField
        dataTestId="role"
        data={nameDescriptionData.data}
        onDataChange={nameDescriptionData.onDataChange}
        nameLabel="Name"
        autoFocusName
        hideDescription
      />

      <FormGroup label="Description" fieldId="role-description">
        <TextArea
          id="role-description"
          data-testid="role-description"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Describe what this role is for and who should use it"
          resizeOrientation="vertical"
        />
      </FormGroup>

      <RoleLabelsSection labels={labels} onLabelsChange={onLabelsChange} />

      <PermissionRulesSection rules={rules} onRulesChange={onRulesChange} />
    </Form>
  );
};

export default CreateRoleForm;
