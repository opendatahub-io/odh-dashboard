import * as React from 'react';
import { CardBody, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import { ServingRuntimePlatform } from '~/types';
import AddModelFooter from './AddModelFooter';

const SelectNIMCard: React.FC = () => (
  <OverviewCard
    objectType={ProjectObjectType.modelServer}
    sectionType={SectionType.serving}
    title="NVIDIA NIM model serving platform"
    data-testid="nvidia-nim-platform-card"
  >
    <CardBody>
      <TextContent>
        <Text component="small">
          Models are deployed using NVIDIA NIM microservices. Choose this option when you want to
          deploy your model within a NIM container. Please provide the API key to authenticate with
          the NIM service.
        </Text>
      </TextContent>
    </CardBody>
    <AddModelFooter selectedPlatform={ServingRuntimePlatform.SINGLE} isNIM />
  </OverviewCard>
);

export default SelectNIMCard;
