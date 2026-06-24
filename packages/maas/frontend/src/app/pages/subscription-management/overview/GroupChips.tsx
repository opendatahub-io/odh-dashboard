import * as React from 'react';
import { Button, Content, ContentVariants, Flex, FlexItem, Label } from '@patternfly/react-core';
import { GroupReference } from '~/app/types/subscriptions';

type GroupChipsProps = {
  groups: GroupReference[];
  maxVisible?: number;
};

const DEFAULT_MAX_VISIBLE = 8;

const GroupChips: React.FC<GroupChipsProps> = ({ groups, maxVisible = DEFAULT_MAX_VISIBLE }) => {
  const [showAll, setShowAll] = React.useState(false);

  const displayedGroups = showAll ? groups : groups.slice(0, maxVisible);
  const overflowCount = groups.length - maxVisible;

  return (
    <Flex
      gap={{ default: 'gapSm' }}
      flexWrap={{ default: 'wrap' }}
      alignItems={{ default: 'alignItemsCenter' }}
    >
      <FlexItem>
        <Content component={ContentVariants.small} className="pf-v6-u-mb-0">
          <strong>Groups</strong>
        </Content>
      </FlexItem>
      {groups.length === 0 ? (
        <FlexItem>
          <Content component={ContentVariants.small}>No groups</Content>
        </FlexItem>
      ) : (
        <>
          {displayedGroups.map((group) => (
            <FlexItem key={group.name}>
              <Label isCompact>{group.name}</Label>
            </FlexItem>
          ))}
          {overflowCount > 0 && (
            <FlexItem>
              <Button
                variant="link"
                isInline
                onClick={() => setShowAll((prev) => !prev)}
                data-testid={showAll ? 'show-less-groups' : 'show-more-groups'}
                style={{ textDecoration: 'none' }}
              >
                {showAll ? 'Show less' : `${overflowCount} more`}
              </Button>
            </FlexItem>
          )}
        </>
      )}
    </Flex>
  );
};

export default GroupChips;
