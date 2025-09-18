import * as React from 'react';
import { Content, Flex, FlexItem, Title } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import GenAiCoreProjectSelector from '~/app/GenAiCoreProjectSelector';

type GenAiCoreHeaderProps = {
  title: string;
  getRedirectPath: (namespace: string) => string;
};

const GenAiCoreHeader: React.FC<GenAiCoreHeaderProps> = ({ title, getRedirectPath }) => {
  const { namespace } = useParams<{ namespace: string }>();
  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapLg' }}>
      <FlexItem>
        <Title headingLevel="h1">{title}</Title>
      </FlexItem>
      <FlexItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
          <ProjectIconWithSize size={IconSize.LG} />
          <FlexItem>
            <Content component="p">Project</Content>
          </FlexItem>
          <FlexItem>
            <GenAiCoreProjectSelector namespace={namespace} getRedirectPath={getRedirectPath} />
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  );
};
export default GenAiCoreHeader;
