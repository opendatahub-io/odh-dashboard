import React from 'react';
import { ModelVersion } from '~/app/types';
declare const useDeployModalExtension: ({ mv, mvLoaded, mvError, }: {
    mv: ModelVersion;
    mvLoaded: boolean;
    mvError: Error | undefined;
}) => {
    deployModal: React.JSX.Element;
    setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
    buttonState: {
        visible: boolean;
        enabled?: boolean;
        tooltip?: string;
    } | undefined;
};
export default useDeployModalExtension;
