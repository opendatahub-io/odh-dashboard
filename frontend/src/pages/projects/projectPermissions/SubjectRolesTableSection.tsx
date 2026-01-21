import * as React from 'react';
import { Button, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { RBAC_SUBJECT_KIND_GROUP, RBAC_SUBJECT_KIND_USER } from '#~/concepts/permissions/const';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import type { RoleRef } from '#~/concepts/permissions/types';
import SubjectRolesTable from './SubjectRolesTable';
import { DEFAULT_ROLE_REFS, FilterDataType } from './const';
import SubjectRolesAddRow from './SubjectRolesAddRow';
import { useRoleAssignmentData } from './useRoleAssignmentData';
import { buildRoleBindingSubject, upsertRoleBinding } from './roleBindingMutations';

type SubjectRolesTableSectionProps = {
  subjectKind: 'user' | 'group';
  filterData: FilterDataType;
  onClearFilters: () => void;
  onRoleClick?: (roleRef: RoleRef) => void;
};

const SubjectRolesTableSection: React.FC<SubjectRolesTableSectionProps> = ({
  subjectKind,
  filterData,
  onClearFilters,
  onRoleClick,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { roleBindings } = usePermissionsContext();
  const { existingSubjectNames, assignedRolesBySubject } = useRoleAssignmentData(subjectKind);
  const [isAdding, setIsAdding] = React.useState(false);

  return (
    <Stack hasGutter>
      <StackItem>
        <Flex
          direction={{ default: 'row' }}
          gap={{ default: 'gapSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <HeaderIcon
            type={subjectKind === 'user' ? ProjectObjectType.user : ProjectObjectType.group}
          />
          <FlexItem>
            <Title headingLevel="h2" size="xl">
              {subjectKind === 'user' ? 'Users' : 'Groups'}
            </Title>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <SubjectRolesTable
          subjectKind={subjectKind}
          filterData={filterData}
          onClearFilters={onClearFilters}
          footerRow={
            isAdding
              ? () => (
                  <SubjectRolesAddRow
                    subjectKind={subjectKind}
                    existingSubjectNames={existingSubjectNames}
                    availableRoles={DEFAULT_ROLE_REFS}
                    assignedRolesBySubject={assignedRolesBySubject}
                    onCancel={() => setIsAdding(false)}
                    onSave={async ({ subjectName, roleRef }) => {
                      const namespace = currentProject.metadata.name;
                      const rbSubjectKind =
                        subjectKind === 'user' ? RBAC_SUBJECT_KIND_USER : RBAC_SUBJECT_KIND_GROUP;
                      await upsertRoleBinding({
                        roleBindings: roleBindings.data,
                        namespace,
                        subjectKind: rbSubjectKind,
                        subject: buildRoleBindingSubject(rbSubjectKind, subjectName),
                        roleRef,
                      });
                      await roleBindings.refresh();
                      setIsAdding(false);
                    }}
                  />
                )
              : undefined
          }
          onRoleClick={onRoleClick}
        />
      </StackItem>
      <StackItem>
        <Button
          data-testid={`add-${subjectKind}-button`}
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={() => setIsAdding(true)}
          isDisabled={isAdding}
          style={{ paddingLeft: 'var(--pf-t--global--spacer--lg)' }}
        >
          {subjectKind === 'user' ? 'Add user' : 'Add group'}
        </Button>
      </StackItem>
    </Stack>
  );
};

export default SubjectRolesTableSection;
