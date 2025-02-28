import * as React from 'react';
export type BrowserStorageContextType = {
    /** Based on parseJSON it can be any jsonify-able item */
    getValue: (storageKey: string, parseJSON: boolean, isSessionStorage?: boolean) => unknown;
    /** Returns a boolean if it was able to json-ify it. */
    setJSONValue: (storageKey: string, value: unknown, isSessionStorage?: boolean) => boolean;
    setStringValue: (storageKey: string, value: string, isSessionStorage?: boolean) => void;
};
/**
 * @returns {boolean} if it was successful, false if it was not
 */
export type SetBrowserStorageHook<T> = (value: T) => boolean;
/**
 * useBrowserStorage will handle all the effort behind managing localStorage or sessionStorage.
 */
export declare const useBrowserStorage: <T>(storageKey: string, defaultValue: T, jsonify?: boolean, isSessionStorage?: boolean) => [T, SetBrowserStorageHook<T>];
type BrowserStorageContextProviderProps = {
    children: React.ReactNode;
};
/**
 * @see useBrowserStorage
 */
export declare const BrowserStorageContextProvider: React.FC<BrowserStorageContextProviderProps>;
export {};
