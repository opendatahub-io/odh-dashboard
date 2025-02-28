import * as React from 'react';
import { RegisteredModel } from '~/app/types';
type RegisteredModelTableRowProps = {
    registeredModel: RegisteredModel;
    isArchiveRow?: boolean;
    hasDeploys?: boolean;
    refresh: () => void;
};
declare const RegisteredModelTableRow: React.FC<RegisteredModelTableRowProps>;
export default RegisteredModelTableRow;
