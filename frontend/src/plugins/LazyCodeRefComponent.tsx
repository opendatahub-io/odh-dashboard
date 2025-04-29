import React, { Suspense } from 'react';

type LazyCodeRefComponentProps<T> = {
  component: () => Promise<React.ComponentType<T> | { default: React.ComponentType<T> }>;
  fallback?: React.ReactNode;
  props?: T;
};

export function LazyCodeRefComponent<T>({
  component,
  fallback,
  props,
}: LazyCodeRefComponentProps<T>): JSX.Element {
  const LazyComponent = React.useMemo(
    () =>
      React.lazy(() =>
        component().then((module) => ('default' in module ? module : { default: module })),
      ),
    [component],
  );

  return (
    <Suspense fallback={fallback}>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <LazyComponent {...props} />
    </Suspense>
  );
}
