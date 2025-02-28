import * as React from 'react';
import { ContentProps } from '@patternfly/react-core';
type PopoverListContentProps = ContentProps & {
    leadText?: React.ReactNode;
    listHeading?: React.ReactNode;
    listItems: React.ReactNode[];
};
declare const PopoverListContent: React.FC<PopoverListContentProps>;
export default PopoverListContent;
