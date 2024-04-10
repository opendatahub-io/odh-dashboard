import * as React from 'react';
import { CardBody, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import { ServingRuntimePlatform } from '~/types';
import AddModelFooter from './AddModelFooter';

const SelectMultiModelCard: React.FC = () => (
  <OverviewCard
    objectType={ProjectObjectType.modelServer}
    sectionType={SectionType.serving}
    title="Multi-model serving platform"
    data-testid="multi-serving-platform-card"
  >
    <CardBody>
      <TextContent>
        <Text component="small">
          Multiple models can be deployed on one shared model server. Choose this option when you
          want to deploy a number of small or medium-sized models that can share the server
          resources.
        </Text>
      </TextContent>
    </CardBody>
    <AddModelFooter selectedPlatform={ServingRuntimePlatform.MULTI} />
  </OverviewCard>
);

export default SelectMultiModelCard;
