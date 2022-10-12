import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { NotebookSize } from '../../../../../types';

type ContainerDetailsProps = {
  notebookSize: NotebookSize;
};

const WorkspaceSizeDetails: React.FC<ContainerDetailsProps> = ({ notebookSize }) => {
  const {
    resources: { requests, limits },
  } = notebookSize;

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>Limits</DescriptionListTerm>
        <DescriptionListDescription>
          {limits?.cpu ?? 'Unknown'} CPU, {limits?.memory ?? 'Unknown'} Memory
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Requests</DescriptionListTerm>
        <DescriptionListDescription>
          {requests?.cpu ?? 'Unknown'} CPU, {requests?.memory ?? 'Unknown'} Memory
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default WorkspaceSizeDetails;
