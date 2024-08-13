import { MergeWithCustomizer } from 'lodash';

/**
 * When given two object arrays that have "name" keys, replace when keys are the same, or add to
 * the end when new key.
 *
 * Note: returns `undefined` if invalid data is provided.
 *
 * @see mergeWith -- lodash mergeWith customizer
 */
export const smartMergeArraysWithNameObjects: MergeWithCustomizer = (objValue, srcValue) => {
  type GoodArray = { name: string }[];
  const isGoodArray = (v: any): v is GoodArray => Array.isArray(v) && v.length > 0 && v[0].name;
  if (isGoodArray(objValue) && isGoodArray(srcValue)) {
    // Arrays with objects that have a .name property, sync on merge for the name
    return srcValue.reduce<GoodArray>((newArray, elm) => {
      const key = elm.name;
      const index = newArray.findIndex(({ name }) => name === key);
      if (index >= 0) {
        // existing value, replace
        newArray[index] = elm;
      } else {
        // didn't find existing name, add to end
        newArray.push(elm);
      }

      return newArray;
    }, objValue);
  }
};
