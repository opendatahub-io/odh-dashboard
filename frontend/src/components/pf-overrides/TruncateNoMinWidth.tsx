import * as React from 'react';
import { Truncate } from '@patternfly/react-core';

import './TruncateNoMinWidth.scss';

type TruncateNoMinWidthProps = React.ComponentProps<typeof Truncate>;

const TruncateNoMinWidth: React.FC<TruncateNoMinWidthProps> = (props) => (
  <Truncate {...props} className="truncate-no-min-width" />
);

export default TruncateNoMinWidth;
