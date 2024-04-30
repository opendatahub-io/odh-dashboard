import * as React from 'react';
import { Button, Flex, FlexItem, Text, TextContent, TextVariants } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';

interface CollapsibleSectionProps {
  open?: boolean;
  setOpen?: (update: boolean) => void;
  title: string;
  titleVariant?: TextVariants.h1 | TextVariants.h2;
  children?: React.ReactNode;
  id?: string;
  showChildrenWhenClosed?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  open,
  setOpen,
  title,
  titleVariant = TextVariants.h2,
  children,
  id,
  showChildrenWhenClosed,
}) => {
  const [innerOpen, setInnerOpen] = React.useState<boolean>(true);
  const localId = id || title.replace(/ /g, '-');
  const titleId = `${localId}-title`;

  return (
    <>
      <Flex
        gap={{ default: 'gapMd' }}
        alignItems={{ default: 'alignItemsCenter' }}
        style={
          (open ?? innerOpen) || showChildrenWhenClosed
            ? {
                marginBottom: 'var(--pf-v5-global--spacer--md)',
              }
            : undefined
        }
      >
        <FlexItem>
          <Button
            aria-labelledby={titleId}
            aria-expanded={open}
            variant="plain"
            style={{
              paddingLeft: 0,
              paddingRight: 0,
              fontSize:
                titleVariant === TextVariants.h2
                  ? 'var(--pf-v5-global--FontSize--xl)'
                  : 'var(--pf-v5-global--FontSize--2xl)',
            }}
            onClick={() => (setOpen ? setOpen(!open) : setInnerOpen((prev) => !prev))}
          >
            {open ?? innerOpen ? <AngleDownIcon /> : <AngleRightIcon />}
          </Button>
        </FlexItem>
        <FlexItem>
          <TextContent>
            <Text id={titleId} component={titleVariant}>
              {title}
            </Text>
          </TextContent>
        </FlexItem>
      </Flex>
      {(open ?? innerOpen) || showChildrenWhenClosed ? children : null}
    </>
  );
};

export default CollapsibleSection;
