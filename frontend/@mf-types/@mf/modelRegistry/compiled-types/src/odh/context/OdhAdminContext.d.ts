import React from 'react';
interface OdhAdminContextType {
    isAdminUser: boolean;
}
export declare const OdhAdminContext: React.Context<OdhAdminContextType>;
interface OdhAdminContextProviderProps {
    children: React.ReactNode;
    isAdminUser: boolean;
}
export declare const OdhAdminContextProvider: React.FC<OdhAdminContextProviderProps>;
export {};
