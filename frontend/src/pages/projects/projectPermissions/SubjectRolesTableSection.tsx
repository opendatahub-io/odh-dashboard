import * as React from 'react';
import { Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import type { FilterDataType } from './const';
import SubjectRolesTable from './SubjectRolesTable';
import type { SubjectKindSelection } from './types';

type SubjectRolesTableSectionProps = {
  subjectKind: SubjectKindSelection;
  filterData: FilterDataType;
  onClearFilters: () => void;
};

const SubjectRolesTableSection: React.FC<SubjectRolesTableSectionProps> = ({
  subjectKind,
  filterData,
  onClearFilters,
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
      />
    </StackItem>
  </Stack>
);

export default SubjectRolesTableSection;
