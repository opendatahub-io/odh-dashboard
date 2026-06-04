import * as React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  TextArea,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import K8sNameDescriptionField from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import { UseK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import RoleLabelsSection from './RoleLabelsSection';
import type { LabelEntry } from './types';

type CreateRoleFormProps = {
  nameDescriptionData: UseK8sNameDescriptionFieldData;
  description: string;
  onDescriptionChange: (value: string) => void;
  labels: LabelEntry[];
  onLabelsChange: (labels: LabelEntry[]) => void;
};

const CreateRoleForm: React.FC<CreateRoleFormProps> = ({
  nameDescriptionData,
  description,
  onDescriptionChange,
  labels,
  onLabelsChange,
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

      <Title headingLevel="h2" size="md">
        Permissions rules (verbs){' '}
        <FieldGroupHelpLabelIcon content="Define the permissions that this role grants. Each rule specifies which actions (verbs) are allowed on which resources." />
      </Title>
      <Content component="p">Define the permissions that this role grants by adding rules.</Content>
      <Content component="p" data-testid="permissions-empty-state">
        No permissions set for this role.
      </Content>
      <Flex>
        <FlexItem>
          {/* TODO: Enable when permission rules are implemented (RHOAIENG-63157) */}
          <Button variant="link" icon={<PlusCircleIcon />} data-testid="role-add-rule" isDisabled>
            Add rule
          </Button>
        </FlexItem>
        <FlexItem>
          {/* TODO: Enable when template import is implemented (RHOAIENG-63156) */}
          <Button variant="link" data-testid="role-import-template" isDisabled>
            Import rules from template
          </Button>
        </FlexItem>
      </Flex>
    </Form>
  );
};

export default CreateRoleForm;
