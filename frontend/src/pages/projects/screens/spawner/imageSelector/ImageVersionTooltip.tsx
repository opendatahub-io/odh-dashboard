import * as React from 'react';
import { Title, Tooltip } from '@patternfly/react-core';
import { ImageVersionDependencyType } from '../types';
import { getNameVersionString } from '../spawnerUtils';

type ImageVersionTooltipProps = {
  dependencies: ImageVersionDependencyType[];
};

const ImageVersionTooltip: React.FC<ImageVersionTooltipProps> = ({ children, dependencies }) => {
  if (dependencies.length === 0) {
    return null;
  }

  return (
    <Tooltip
      content={
        <>
          <Title headingLevel="h6">Packages included:</Title>
          {dependencies.map((dep) => {
            const depString = getNameVersionString(dep);
            return <p key={depString}>{depString}</p>;
          })}
        </>
      }
      position="right"
    >
      <div>{children}</div>
    </Tooltip>
  );
};

export default ImageVersionTooltip;
