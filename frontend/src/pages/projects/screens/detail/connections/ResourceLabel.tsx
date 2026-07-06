import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';

type Props = {
  title: string;
  resourceType: ProjectObjectType;
  outlineColor?:
    | 'teal'
    | 'blue'
    | 'green'
    | 'orange'
    | 'purple'
    | 'red'
    | 'orangered'
    | 'grey'
    | 'yellow';
};

const ResourceLabel: React.FC<Props> = ({ title, resourceType, outlineColor }) => (
  <Label
    variant="outline"
    icon={<TypedObjectIcon resourceType={resourceType} useTypedColor />}
    color={outlineColor || undefined}
  >
    {title}
  </Label>
);

export default ResourceLabel;
