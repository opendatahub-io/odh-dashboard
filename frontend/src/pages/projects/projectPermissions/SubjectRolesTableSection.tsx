import * as React from 'react';
import { Button, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import SubjectRolesTable from './SubjectRolesTable';
import { FilterDataType } from './const';

type SubjectRolesTableSectionProps = {
  subjectKind: 'user' | 'group';
  isVisible: boolean;
  filterData: FilterDataType;
  onClearFilters: () => void;
};

const SubjectRolesTableSection: React.FC<SubjectRolesTableSectionProps> = ({
  subjectKind,
  isVisible,
  filterData,
  onClearFilters,
}) => {
  if (!isVisible) {
    return null;
  }

  const title = subjectKind === 'user' ? 'Users' : 'Groups';

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
              {title}
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
      <StackItem>
        <Button
          data-testid={`add-${subjectKind}-button`}
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          isDisabled
          style={{ paddingLeft: 'var(--pf-t--global--spacer--lg)' }}
        >
          {subjectKind === 'user' ? 'Add user' : 'Add group'}
        </Button>
      </StackItem>
    </Stack>
  );
};

export default SubjectRolesTableSection;
