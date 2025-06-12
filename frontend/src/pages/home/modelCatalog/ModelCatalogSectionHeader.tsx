import * as React from 'react';
import { Flex, FlexItem, Content, ContentVariants } from '@patternfly/react-core';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';

const ModelCatalogSectionHeader: React.FC = () => (
  <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
    <FlexItem>
      <HeaderIcon type={ProjectObjectType.modelCatalog} sectionType={SectionType.training} />
    </FlexItem>
    <FlexItem>
      <Content component={ContentVariants.h1}>Model catalog</Content>
    </FlexItem>
  </Flex>
);

export default ModelCatalogSectionHeader;
