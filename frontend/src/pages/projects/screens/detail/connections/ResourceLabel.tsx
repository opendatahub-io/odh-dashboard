import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TypedObjectIcon from '#~/concepts/design/TypedObjectIcon';

type Props = {
  title: string;
  resourceType: ProjectObjectType;
};

const ResourceLabel: React.FC<Props> = ({ title, resourceType }) => (
  <Label variant="outline" icon={<TypedObjectIcon resourceType={resourceType} useTypedColor />}>
    {title}
  </Label>
);

export default ResourceLabel;
