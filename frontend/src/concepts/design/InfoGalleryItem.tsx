import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  GalleryItemProps,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  ProjectObjectType,
  SectionType,
  sectionTypeBackgroundColor,
} from '~/concepts/design/utils';
import DividedGalleryItem from '~/concepts/design/DividedGalleryItem';
import TypedObjectIcon from '~/concepts/design/TypedObjectIcon';

const HEADER_ICON_SIZE = 40;
const HEADER_ICON_PADDING = 2;

type InfoGalleryItemProps = {
  title: string;
  sectionType: SectionType;
  resourceType: ProjectObjectType;
  description: React.ReactNode;
  isOpen: boolean;
  onClick?: () => void;
  testId?: string;
} & GalleryItemProps;

const InfoGalleryItem: React.FC<InfoGalleryItemProps> = ({
  title,
  resourceType,
  sectionType,
  description,
  isOpen,
  onClick,
  testId,
  ...rest
}) => (
  <DividedGalleryItem data-testid={testId} {...rest}>
    <Stack hasGutter>
      <StackItem>
        <Flex
          gap={{ default: 'gapMd' }}
          direction={{ default: isOpen ? 'column' : 'row' }}
          alignItems={{ default: isOpen ? 'alignItemsFlexStart' : 'alignItemsCenter' }}
        >
          <FlexItem
            style={{
              display: 'inline-block',
              width: HEADER_ICON_SIZE,
              height: HEADER_ICON_SIZE,
              padding: HEADER_ICON_PADDING,
              borderRadius: HEADER_ICON_SIZE / 2,
              background: sectionTypeBackgroundColor(sectionType),
            }}
          >
            <TypedObjectIcon
              resourceType={resourceType}
              style={{
                width: HEADER_ICON_SIZE - HEADER_ICON_PADDING * 2,
                height: HEADER_ICON_SIZE - HEADER_ICON_PADDING * 2,
              }}
            />
          </FlexItem>
          {onClick ? (
            <Button
              data-testid={testId ? `${testId}-button` : undefined}
              variant={ButtonVariant.link}
              isInline
              onClick={onClick}
              style={{
                fontSize: 'var(--pf-t--global--font--size--body--default)',
                fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
              }}
            >
              {title}
            </Button>
          ) : (
            <FlexItem>{title}</FlexItem>
          )}
        </Flex>
      </StackItem>
      {isOpen ? <StackItem isFilled>{description}</StackItem> : null}
    </Stack>
  </DividedGalleryItem>
);

export default InfoGalleryItem;
