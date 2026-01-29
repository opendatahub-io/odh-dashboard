import * as React from 'react';
import { Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { FilterDataType } from './const';
import SubjectRolesTable from './SubjectRolesTable';

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
}) => (
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
        onRoleClick={onRoleClick}
      />
    </StackItem>
  </Stack>
);

export default SubjectRolesTableSection;
