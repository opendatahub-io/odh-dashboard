import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  GalleryItemProps,
  Stack,
  StackItem,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { SectionType, sectionTypeBackgroundColor } from '~/concepts/design/utils';
import DividedGalleryItem from '~/concepts/design/DividedGalleryItem';

const HEADER_ICON_SIZE = 40;
const HEADER_ICON_PADDING = 2;

type InfoGalleryItemProps = {
  title: string;
  imgSrc: string;
  sectionType: SectionType;
  description: string;
  isOpen: boolean;
  onClick?: () => void;
} & GalleryItemProps;

const InfoGalleryItem: React.FC<InfoGalleryItemProps> = ({
  title,
  imgSrc,
  sectionType,
  description,
  isOpen,
  onClick,
  ...rest
}) => (
  <DividedGalleryItem {...rest}>
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
            <img
              width={HEADER_ICON_SIZE - HEADER_ICON_PADDING * 2}
              height={HEADER_ICON_SIZE - HEADER_ICON_PADDING * 2}
              src={imgSrc}
              alt=""
            />
          </FlexItem>
          {onClick ? (
            <Button
              variant={ButtonVariant.link}
              isInline
              onClick={onClick}
              style={{
                fontSize: 'var(--pf-v5-global--FontSize--md)',
                fontWeight: 'var(--pf-v5-global--FontWeight--bold)',
              }}
            >
              {title}
            </Button>
          ) : (
            <FlexItem>{title}</FlexItem>
          )}
        </Flex>
      </StackItem>
      {isOpen ? (
        <StackItem isFilled>
          <TextContent>
            <Text component="small">{description}</Text>
          </TextContent>
        </StackItem>
      ) : null}
    </Stack>
  </DividedGalleryItem>
);

export default InfoGalleryItem;
