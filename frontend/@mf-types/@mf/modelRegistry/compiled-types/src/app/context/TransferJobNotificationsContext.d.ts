import React from 'react';
import { type RegistrationToastMessagesParams } from '~/app/pages/modelRegistry/screens/RegisterModel/registrationToastMessages';
type WatchedJob = {
    jobName: string;
    jobNamespace: string;
    registryName: string;
    displayParams: RegistrationToastMessagesParams;
};
type TransferJobNotificationsContextType = {
    watchJob: (job: WatchedJob) => void;
};
export declare const TransferJobNotificationsContext: React.Context<TransferJobNotificationsContextType>;
export declare const TransferJobNotificationsProvider: React.FC<React.PropsWithChildren>;
export {};
