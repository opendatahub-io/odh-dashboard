import React from 'react';
type LazyCodeRefComponentProps<T> = {
    component: () => Promise<React.ComponentType<T> | {
        default: React.ComponentType<T>;
    }>;
    fallback?: React.ReactNode;
    props?: T;
};
export declare function LazyCodeRefComponent<T>({ component, fallback, props, }: LazyCodeRefComponentProps<T>): JSX.Element;
export {};
