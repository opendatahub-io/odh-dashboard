import * as React from 'react';
import { Form, FormGroup, TextArea } from '@patternfly/react-core';
import type { UseK8sNameDescriptionFieldData } from '@odh-dashboard/k8s-core';
import K8sNameDescriptionField from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import RoleLabelsSection from './RoleLabelsSection';
import PermissionRulesSection from './PermissionRulesSection';
import type { LabelEntry, RuleEntry } from './types';

type CreateRoleFormProps = {
  nameDescriptionData: UseK8sNameDescriptionFieldData;
  description: string;
  onDescriptionChange: (value: string) => void;
  labels: LabelEntry[];
  onLabelsChange: (labels: LabelEntry[]) => void;
  onHasInvalidLabelsChange?: (hasInvalid: boolean) => void;
  rules: RuleEntry[];
  onRulesChange: (rules: RuleEntry[]) => void;
  onImportTemplate: () => void;
};

const CreateRoleForm: React.FC<CreateRoleFormProps> = ({
  nameDescriptionData,
  description,
  onDescriptionChange,
  labels,
  onLabelsChange,
  onHasInvalidLabelsChange,
  rules,
  onRulesChange,
  onImportTemplate,
}) => {
  const handleDescriptionChange = React.useCallback(
    (_event: React.FormEvent<HTMLTextAreaElement>, value: string) => {
      onDescriptionChange(value);
    },
    [onDescriptionChange],
  );

  return (
    <Form onSubmit={(e) => e.preventDefault()} data-testid="create-role-form">
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
          resizeOrientation="vertical"
        />
      </FormGroup>

      <RoleLabelsSection
        labels={labels}
        onLabelsChange={onLabelsChange}
        onHasInvalidLabelsChange={onHasInvalidLabelsChange}
      />

      <PermissionRulesSection
        rules={rules}
        onRulesChange={onRulesChange}
        onImportTemplate={onImportTemplate}
      />
    </Form>
  );
};

export default CreateRoleForm;
