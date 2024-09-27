import * as React from 'react';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { ProjectObjectType, typedColor } from '~/concepts/design/utils';
import NotebookIcon from '~/images/icons/NotebookIcon';
import ModelIcon from '~/images/icons/ModelsIcon';

type TypedObjectIconProps = SVGIconProps & {
  resourceType: ProjectObjectType;
  useTypedColor?: boolean;
  size?: number;
};
const TypedObjectIcon: React.FC<TypedObjectIconProps> = ({
  resourceType,
  useTypedColor,
  style,
  ...rest
}) => {
  switch (resourceType) {
    case ProjectObjectType.notebook:
      return (
        <NotebookIcon
          style={{
            color: useTypedColor ? typedColor(resourceType) : undefined,
            ...(style || {}),
          }}
          {...rest}
        />
      );
    case ProjectObjectType.deployedModels:
      return (
        <ModelIcon
          style={{
            color: useTypedColor ? typedColor(resourceType) : undefined,
            ...(style || {}),
          }}
          {...rest}
        />
      );
    default:
      return null;
  }
};

export default TypedObjectIcon;
