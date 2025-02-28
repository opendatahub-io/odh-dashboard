import * as React from 'react';
import { UserSettings, ConfigSettings } from '~/shared/types';
type AppContextProps = {
    config: ConfigSettings;
    user: UserSettings;
};
export declare const AppContext: React.Context<AppContextProps>;
export declare const useAppContext: () => AppContextProps;
export {};
