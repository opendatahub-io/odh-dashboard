import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Content,
  ContentVariants,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';

interface CollapsibleSectionProps {
  open?: boolean;
  setOpen?: (update: boolean) => void;
  title: string;
  titleVariant?: ContentVariants.h1 | ContentVariants.h2;
  children?: React.ReactNode;
  id?: string;
  showChildrenWhenClosed?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  open,
  setOpen,
  title,
  titleVariant = ContentVariants.h2,
  children,
  id,
  showChildrenWhenClosed,
}) => {
  const [innerOpen, setInnerOpen] = React.useState<boolean>(true);
  const localId = id || title.replace(/ /g, '-');
  const titleId = `${localId}-title`;

  return (
    <Stack hasGutter>
      <StackItem>
        <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Button
              icon={open ?? innerOpen ? <AngleDownIcon /> : <AngleRightIcon />}
              aria-labelledby={titleId}
              aria-expanded={open ?? innerOpen}
              variant="plain"
              className="pf-v6-u-px-0"
              onClick={() => (setOpen ? setOpen(!open) : setInnerOpen((prev) => !prev))}
            />
          </FlexItem>
          <FlexItem>
            <Content>
              <Content id={titleId} component={titleVariant}>
                {title}
              </Content>
            </Content>
          </FlexItem>
        </Flex>
      </StackItem>
      {(open ?? innerOpen) || showChildrenWhenClosed ? <StackItem>{children}</StackItem> : null}
    </Stack>
  );
};

export default CollapsibleSection;
