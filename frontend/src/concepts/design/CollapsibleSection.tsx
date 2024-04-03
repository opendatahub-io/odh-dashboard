import * as React from 'react';
import { Button, Flex, FlexItem, Text, TextContent, TextVariants } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';

interface CollapsibleSectionProps {
  initialOpen?: boolean;
  title: string;
  children?: React.ReactNode;
  id?: string;
  showChildrenWhenClosed?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  initialOpen = true,
  title,
  children,
  id,
  showChildrenWhenClosed,
  onOpenChange,
}) => {
  const [open, setOpen] = React.useState<boolean>(initialOpen);
  const localId = id || title.replace(' ', '-');
  const titleId = `${localId}-title`;

  return (
    <div
      style={{
        padding: open ? undefined : 'var(--pf-v5-global--spacer--md)',
      }}
    >
      <Flex
        gap={{ default: 'gapMd' }}
        style={
          open || showChildrenWhenClosed
            ? {
                marginBottom: 'var(--pf-v5-global--spacer--md)',
                marginLeft: open ? 'var(--pf-v5-global--spacer--md)' : undefined,
              }
            : undefined
        }
      >
        <FlexItem>
          <Button
            aria-labelledby={titleId}
            aria-expanded={open}
            isInline
            variant="link"
            onClick={() => {
              setOpen((prev) => {
                if (onOpenChange) {
                  onOpenChange(!prev);
                }
                return !prev;
              });
            }}
          >
            {open ? <AngleDownIcon /> : <AngleRightIcon />}
          </Button>
        </FlexItem>
        <FlexItem>
          <TextContent>
            <Text id={titleId} component={TextVariants.h2}>
              {title}
            </Text>
          </TextContent>
        </FlexItem>
      </Flex>
      {open || showChildrenWhenClosed ? children : null}
    </div>
  );
};

export default CollapsibleSection;
