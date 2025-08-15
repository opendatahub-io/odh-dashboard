import type { AnyObject } from '@openshift/dynamic-plugin-sdk';
import { forOwn, isPlainObject } from 'lodash-es';

/**
 * Recursive equivalent of Lodash `forOwn` function that traverses objects and arrays.
 */
export const visitDeep = <TValue>(
  obj: AnyObject,
  predicate: (value: unknown) => value is TValue,
  valueCallback: (value: TValue, key: string, container: AnyObject) => void,
  isObject: (obj: unknown) => obj is AnyObject = (o): o is AnyObject => isPlainObject(o),
): void => {
  forOwn(obj, (value: unknown, key: string, container: AnyObject) => {
    if (predicate(value)) {
      valueCallback(value, key, container);
    } else if (isObject(value)) {
      visitDeep(value, predicate, valueCallback, isObject);
    } else if (Array.isArray(value)) {
      value.forEach((element) => {
        visitDeep(element, predicate, valueCallback, isObject);
      });
    }
  });
};
