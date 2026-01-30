import * as React from 'react';
import {
  Bullseye,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Icon,
  Radio,
} from '@patternfly/react-core';
import { ProjectObjectType, typedBackgroundColor } from '#~/concepts/design/utils.ts';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon.tsx';
import SubjectNameTypeaheadSelect from '#~/pages/projects/projectPermissions/components/SubjectNameTypeaheadSelect';

type AssignRolesSubjectSectionProps = {
  isManageMode: boolean;
  subjectKind: 'user' | 'group';
  subjectName: string;
  existingSubjectNames: string[];
  onSubjectKindChange: (kind: 'user' | 'group') => void;
  onSubjectNameChange: (name: string) => void;
};

const AssignRolesSubjectSection: React.FC<AssignRolesSubjectSectionProps> = ({
  isManageMode,
  subjectKind,
  subjectName,
  existingSubjectNames,
  onSubjectKindChange,
  onSubjectNameChange,
}) => (
  <FormSection title="Subject">
    {!isManageMode && (
      <Content component={ContentVariants.p}>
        Select a subject with existing roles or enter a new subject.
      </Content>
    )}
    {!isManageMode && (
      <FormGroup label="Subject kind" isInline fieldId="subject-kind">
        <Radio
          id="subject-kind-user"
          name="subject-kind"
          label="User"
          isChecked={subjectKind === 'user'}
          onChange={() => onSubjectKindChange('user')}
          data-testid="assign-roles-subject-kind-user"
        />
        <Radio
          id="subject-kind-group"
          name="subject-kind"
          label="Group"
          isChecked={subjectKind === 'group'}
          onChange={() => onSubjectKindChange('group')}
          data-testid="assign-roles-subject-kind-group"
        />
      </FormGroup>
    )}
    <FormGroup
      label={subjectKind === 'user' ? 'User name' : 'Group name'}
      isRequired
      fieldId="subject-name"
    >
      {isManageMode ? (
        <Content component={ContentVariants.p} data-testid="assign-roles-subject-readonly">
          <Flex
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Bullseye
                style={{
                  background: typedBackgroundColor(
                    subjectKind === 'user' ? ProjectObjectType.user : ProjectObjectType.group,
                  ),
                  borderRadius: 14,
                  width: 28,
                  height: 28,
                }}
              >
                <Icon size="lg">
                  <TypedObjectIcon
                    resourceType={
                      subjectKind === 'user' ? ProjectObjectType.user : ProjectObjectType.group
                    }
                  />
                </Icon>
              </Bullseye>
            </FlexItem>
            <FlexItem>{subjectName}</FlexItem>
          </Flex>
        </Content>
      ) : (
        <>
          <SubjectNameTypeaheadSelect
            groupLabel={`${subjectKind === 'user' ? 'Users' : 'Groups'} with existing assignment`}
            placeholder={
              subjectKind === 'user'
                ? 'Select a user or type a username'
                : 'Select a group or type a group name'
            }
            existingNames={existingSubjectNames}
            value={subjectName}
            onChange={onSubjectNameChange}
            onClear={() => onSubjectNameChange('')}
            dataTestId="assign-roles-subject-typeahead-toggle"
            createOptionMessage={(v) => `Assign role to "${v}"`}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {subjectKind === 'user'
                  ? 'Only users that have already been assigned roles appear in the dropdown. To add a new user, type their username.'
                  : 'Only groups that have already been assigned roles appear in the dropdown. To add a new group, type its name.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </>
      )}
    </FormGroup>
  </FormSection>
);

export default AssignRolesSubjectSection;
