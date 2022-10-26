import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Text,
} from '@patternfly/react-core';
import { getNameVersionString } from '../screens/spawner/spawnerUtils';
import { ImageVersionDependencyType } from '../screens/spawner/types';

type NotebookPackageDetailsProps = {
  dependencies: ImageVersionDependencyType[];
  title?: string;
};

const NotebookImagePackageDetails: React.FC<NotebookPackageDetailsProps> = ({
  dependencies,
  title,
}) => {
  if (dependencies.length === 0) {
    return null;
  }

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>{title || 'Packages'}</DescriptionListTerm>
        <DescriptionListDescription>
          {dependencies.map(getNameVersionString).map((pkg) => (
            <Text key={pkg}>{pkg}</Text>
          ))}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default NotebookImagePackageDetails;
