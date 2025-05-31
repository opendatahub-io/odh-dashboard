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
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import DividedGalleryItem from '#~/concepts/design/DividedGalleryItem';
import HeaderIcon from '#~/concepts/design/HeaderIcon';

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
          <FlexItem>
            <HeaderIcon type={resourceType} sectionType={sectionType} />
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
