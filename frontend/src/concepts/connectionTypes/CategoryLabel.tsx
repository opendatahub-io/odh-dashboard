import * as React from 'react';
import { Label } from '@patternfly/react-core';

type Props = {
  category: string;
};

const CategoryLabel: React.FC<Props> = ({ category }) => <Label color="purple">{category}</Label>;

export default CategoryLabel;
