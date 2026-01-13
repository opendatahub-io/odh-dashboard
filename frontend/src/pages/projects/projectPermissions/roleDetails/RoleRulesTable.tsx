import * as React from 'react';
import { Badge, Button, Flex, FlexItem, ToolbarItem } from '@patternfly/react-core';
import { TableBase } from '#~/components/table';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import type { ResourceRule } from '#~/k8sTypes';
import RoleRulesTableRow from './RoleRulesTableRow';
import { resourceRulesColumns } from './columns';

const DEFAULT_RULES_PAGE_SIZE = 10;

type RoleRulesTableProps = {
  rules: ResourceRule[];
};

const RoleRulesTable: React.FC<RoleRulesTableProps> = ({ rules }) => {
  const [visibleCount, setVisibleCount] = React.useState(DEFAULT_RULES_PAGE_SIZE);

  const sort = useTableColumnSort<ResourceRule>(resourceRulesColumns, [], undefined);
  const sortedRules = sort.transformData(rules);
  const visibleRows = React.useMemo(
    () => sortedRules.slice(0, visibleCount),
    [sortedRules, visibleCount],
  );

  return (
    <>
      <TableBase
        aria-label="Role rules table"
        data-testid="role-rules-table"
        variant="compact"
        data={visibleRows}
        style={{ tableLayout: 'fixed' }}
        columns={resourceRulesColumns}
        getColumnSort={sort.getColumnSort}
        rowRenderer={(rule, idx) => <RoleRulesTableRow key={idx} rule={rule} />}
        bottomToolbarContent={
          <ToolbarItem
            style={{
              paddingTop: 'var(--pf-t--global--spacer--sm)',
              paddingBottom: 'var(--pf-t--global--spacer--md)',
            }}
          >
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              {visibleCount < rules.length ? (
                <FlexItem>
                  <Button
                    variant="link"
                    isInline
                    onClick={() => setVisibleCount((c) => c + DEFAULT_RULES_PAGE_SIZE)}
                  >
                    View more
                  </Button>
                </FlexItem>
              ) : null}
              <FlexItem>
                <Badge isRead>
                  {`Showing ${Math.min(visibleCount, rules.length)}/${rules.length}`}
                </Badge>
              </FlexItem>
            </Flex>
          </ToolbarItem>
        }
      />
    </>
  );
};

export default RoleRulesTable;
