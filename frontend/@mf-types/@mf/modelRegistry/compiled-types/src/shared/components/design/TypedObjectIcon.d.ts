import * as React from 'react';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { ProjectObjectType } from '~/shared/components/design/utils';
type TypedObjectIconProps = SVGIconProps & {
    resourceType: ProjectObjectType;
    useTypedColor?: boolean;
    size?: number;
};
declare const TypedObjectIcon: React.FC<TypedObjectIconProps>;
export default TypedObjectIcon;
