import * as React from 'react';
import { Button, Content, Flex, FlexItem, Label } from '@patternfly/react-core';

type GroupChipsProps = {
  groups: string[];
  maxVisible?: number;
  highlightedGroup: string | null;
  setHighlightedGroup: (group: string | null) => void;
};

const DEFAULT_MAX_VISIBLE = 8;

const GroupChips: React.FC<GroupChipsProps> = ({
  groups,
  maxVisible = DEFAULT_MAX_VISIBLE,
  highlightedGroup,
  setHighlightedGroup,
}) => {
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
        <Content className="pf-v6-u-mr-md">
          <strong>Groups</strong>
        </Content>
      </FlexItem>
      {groups.length === 0 ? (
        <FlexItem>
          <Content>No groups</Content>
        </FlexItem>
      ) : (
        <>
          {displayedGroups.map((group) => (
            <FlexItem key={group}>
              <Label
                isCompact
                onClick={() => setHighlightedGroup(highlightedGroup === group ? null : group)}
                color={highlightedGroup === group ? 'blue' : 'grey'}
                data-testid={`group-chip-${group}`}
              >
                {group}
              </Label>
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
