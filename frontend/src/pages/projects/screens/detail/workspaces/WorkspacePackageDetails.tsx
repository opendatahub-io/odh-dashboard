import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { WorkspaceImage } from './useWorkspaceImage';

type WorkspacePackageDetailsProps = {
  notebookImage: WorkspaceImage;
};

const WorkspacePackageDetails: React.FC<WorkspacePackageDetailsProps> = ({
  notebookImage: { packages },
}) => {
  const getVersion = (version?: string, prefix?: string): string => {
    if (!version) {
      return '';
    }
    const versionString =
      version.startsWith('v') || version.startsWith('V') ? version.slice(1) : version;

    return `${prefix ? prefix : ''}${versionString}`;
  };

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>Packages</DescriptionListTerm>
        <DescriptionListDescription>
          {packages.length === 0
            ? 'Unknown package info'
            : packages.map((pkg) => (
                <div key={pkg.name}>{`${pkg.name} ${getVersion(pkg.version, 'v')}`}</div>
              ))}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export default WorkspacePackageDetails;
