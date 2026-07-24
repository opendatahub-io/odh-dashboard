export type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(
  propKey: K,
  propValue: T[K],
) => void;

export enum IconSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  XXL = 'xxl',
}

export type Namespace = {
  name: string;
  displayName?: string;
};
