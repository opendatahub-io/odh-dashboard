import * as React from 'react';
import { Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { ProjectSectionID } from './types';

type DetailsSectionProps = {
  id: ProjectSectionID;
  actions: React.ReactNode[];
  title: string;
};

const DetailsSection: React.FC<DetailsSectionProps> = ({ children, id, title, actions }) => {
  return (
    <Stack hasGutter>
      <StackItem>
        <Flex>
          <FlexItem>
            <Title id={id} headingLevel="h4" size="xl">
              {title}
            </Title>
          </FlexItem>
          <FlexItem>{actions}</FlexItem>
        </Flex>
      </StackItem>
      <StackItem>{children}</StackItem>
    </Stack>
  );
};

export default DetailsSection;
