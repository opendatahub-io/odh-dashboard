import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Text,
  TextContent,
  TextProps,
  TextVariants,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import { SectionType, sectionTypeBorderColor } from './utils';

interface CollapsibleSectionProps {
  sectionType: SectionType;
  initialOpen?: boolean;
  title: string;
  children?: React.ReactNode;
  id?: string;
  showChildrenWhenClosed?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  titleComponent?: TextProps['component'];
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  sectionType,
  initialOpen = true,
  title,
  titleComponent = TextVariants.h2,
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
        background: open ? undefined : 'var(--pf-v5-global--BackgroundColor--100)',
        border:
          open || showChildrenWhenClosed
            ? undefined
            : `1px solid ${sectionTypeBorderColor(sectionType)}`,
        borderRadius: 16,
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
            style={{ fontSize: 'var(--pf-v5-global--FontSize--xl)' }}
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
            <Text id={titleId} component={titleComponent}>
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
