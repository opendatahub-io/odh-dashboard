import * as React from 'react';
import { CardHeader, Flex, FlexItem, Popover, Content } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import TypeBorderedCard from '#~/concepts/design/TypeBorderedCard';

type OverviewCardProps = {
  objectType: ProjectObjectType;
  sectionType: SectionType;
  title?: string;
  headerInfo?: React.ReactNode;
  popoverHeaderContent?: string;
  popoverBodyContent?: string;
  children: React.ReactNode;
  id?: string;
};
const OverviewCard: React.FC<OverviewCardProps> = ({
  objectType,
  sectionType,
  title,
  headerInfo,
  popoverHeaderContent,
  popoverBodyContent,
  children,
  id,
  ...rest
}) => (
  <TypeBorderedCard id={id} objectType={objectType} sectionType={sectionType} {...rest}>
    <CardHeader>
      <Flex
        gap={{ default: 'gapMd' }}
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <HeaderIcon type={objectType} sectionType={sectionType} />
            </FlexItem>
            {title ? (
              <FlexItem>
                <Content>
                  <Content id={id ? `${id}-title` : undefined} component="h3">
                    <b>{title}</b>
                  </Content>
                </Content>
              </FlexItem>
            ) : null}
            {popoverHeaderContent || popoverBodyContent ? (
              <Popover headerContent={popoverHeaderContent} bodyContent={popoverBodyContent}>
                <DashboardPopupIconButton
                  icon={<OutlinedQuestionCircleIcon />}
                  aria-label="More info"
                />
              </Popover>
            ) : null}
          </Flex>
        </FlexItem>
        <FlexItem>{headerInfo}</FlexItem>
      </Flex>
    </CardHeader>
    {children}
  </TypeBorderedCard>
);

export default OverviewCard;
