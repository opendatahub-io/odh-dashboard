import * as React from 'react';
import { TextInput } from '@patternfly/react-core';
type Props = React.ComponentProps<typeof TextInput> & {
    ariaLabelShow?: string;
    ariaLabelHide?: string;
};
declare const PasswordInput: React.FC<Props>;
export default PasswordInput;
