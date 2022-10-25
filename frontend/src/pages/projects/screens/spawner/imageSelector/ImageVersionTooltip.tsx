import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { ImageVersionDependencyType } from '../types';
import NotebookImagePackageDetails from '../../../notebook/NotebookImagePackageDetails';

type ImageVersionTooltipProps = {
  dependencies: ImageVersionDependencyType[];
};

const ImageVersionTooltip: React.FC<ImageVersionTooltipProps> = ({ children, dependencies }) => {
  if (dependencies.length === 0) {
    return null;
  }

  return (
    <Tooltip
      removeFindDomNode
      content={
        <NotebookImagePackageDetails title="Packages included" dependencies={dependencies} />
      }
      position="right"
    >
      <div>{children}</div>
    </Tooltip>
  );
};

export default ImageVersionTooltip;
