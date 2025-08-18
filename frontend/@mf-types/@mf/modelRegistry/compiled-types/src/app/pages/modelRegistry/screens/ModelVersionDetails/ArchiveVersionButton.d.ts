import * as React from 'react';
import { ModelVersion } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import { ModelServingPlatformWatchDeployments } from '~/odh/extension-points';
interface ArchiveButtonProps {
    mv: ModelVersion;
    mrName?: string;
    watcher?: ModelServingPlatformWatchDeployments;
    setIsArchiveModalOpen: (value: React.SetStateAction<boolean>) => void;
}
declare const ArchiveButton: React.ForwardRefExoticComponent<ArchiveButtonProps & React.RefAttributes<HTMLButtonElement>>;
export default ArchiveButton;
