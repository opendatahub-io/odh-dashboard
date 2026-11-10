import * as React from 'react';
type AdminStatusContextType = {
    isAdmin: boolean;
    loaded: boolean;
    settingsUrl: string;
    settingsTitle: string;
};
declare const AdminStatusContext: React.Context<AdminStatusContextType>;
export declare const useAdminStatus: () => AdminStatusContextType;
export declare const AdminStatusProvider: React.FC<React.PropsWithChildren<{
    isAdmin: boolean;
    loaded: boolean;
    settingsUrl: string;
    settingsTitle: string;
}>>;
export default AdminStatusContext;
