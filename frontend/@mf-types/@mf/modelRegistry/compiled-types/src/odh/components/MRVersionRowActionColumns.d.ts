import React from 'react';
import { IAction } from '@patternfly/react-table';
import { ModelVersion } from '~/app/types';
type MRVersionRowActionColumnsProps = {
    mv: ModelVersion;
    mvLoaded: boolean;
    mvError: Error | undefined;
    actions: IAction[];
};
declare const MRVersionRowActionColumns: React.FC<MRVersionRowActionColumnsProps>;
export default MRVersionRowActionColumns;
