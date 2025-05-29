import * as React from 'react';
import NotFound from '#~/pages/NotFound';
import { SupportedArea } from './types';
import useIsAreaAvailable from './useIsAreaAvailable';

type AreaComponentProps = {
  /** What area do you need to be active to show the `children` */
  area: SupportedArea;
  /** Lazy rendered children, keeps from executing the content until we know it's available */
  children: (() => React.ReactNode) | undefined;
  /** Optionally, if the children are the whole page context, render a 404 page */
  isFullPage?: boolean;
};

/**
 * Allows for you to wrap an area in the middle of your JSX.
 */
const AreaComponent: React.FC<AreaComponentProps> = ({ area, children, isFullPage }) => {
  const isAvailable = useIsAreaAvailable(area).status;

  if (!children || typeof children !== 'function') {
    // Typescript needs a gate to stop "what if it is null"
    // TODO: This should be fixed when we enforce strict mode in TS
    return null;
  }

  if (isAvailable) {
    return <>{children()}</>;
  }

  return isFullPage ? <NotFound /> : null;
};

/**
 * Allows you to lock down a component at the definition level.
 *
 * Use-case: This component is only for feature X, if area X is not enabled, we don't want this to
 * render.
 *
 * Example usage:
 * ```
 * const MyAreaComponent = conditionalArea<YourProps>(SupportedArea.YOUR_AREA)((props) => </>)
 * ```
 * Notes:
 *   - Wrap the function definition
 *   - Don't use React.FC<Props>, it is handled internally
 */
export const conditionalArea =
  <Props extends object>(area: SupportedArea, isFullPage?: boolean) =>
  (Component: React.FC<Props>): ((props: Props) => React.JSX.Element) => {
    const ConditionalArea = (props: Props) => (
      <AreaComponent area={area} isFullPage={isFullPage}>
        {() => <Component {...props} />}
      </AreaComponent>
    );

    return ConditionalArea;
  };

export default AreaComponent;
