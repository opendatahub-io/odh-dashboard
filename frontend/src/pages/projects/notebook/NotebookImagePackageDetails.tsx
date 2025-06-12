import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Truncate,
} from '@patternfly/react-core';
import { getNameVersionString } from '#~/pages/projects/screens/spawner/spawnerUtils';
import { ImageVersionDependencyType } from '#~/pages/projects/screens/spawner/types';

type NotebookPackageDetailsProps = {
  dependencies: ImageVersionDependencyType[];
  title?: React.ReactNode;
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
            <div key={pkg}>
              <Truncate content={pkg} />
            </div>
          ))}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default NotebookImagePackageDetails;
