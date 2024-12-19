import * as React from 'react';
import { Td } from '@patternfly/react-table';
type CheckboxTrProps = {
    id: string;
    isChecked: boolean | null;
    onToggle: () => void;
    isDisabled?: boolean;
    tooltip?: string;
} & React.ComponentProps<typeof Td>;
declare const CheckboxTd: React.FC<CheckboxTrProps>;
export default CheckboxTd;
