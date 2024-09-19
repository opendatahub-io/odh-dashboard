import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { CompatibleTypes } from '~/concepts/connectionTypes/utils';

type Props = {
  type: CompatibleTypes;
};

const CompatibilityLabel: React.FC<Props> = ({ type }) => <Label color="blue">{type}</Label>;

export default CompatibilityLabel;
