export const isEnumMember = <T extends object>(
  member: T[keyof T] | string | number | undefined | unknown | null,
  e: T,
): member is T[keyof T] => {
  if (member != null) {
    return Object.entries(e)
      .filter(([key]) => Number.isNaN(Number(key)))
      .map(([, value]) => value)
      .includes(member);
  }
  return false;
};

export const asEnumMember = <T extends object>(
  member: T[keyof T] | string | number | undefined | null,
  e: T,
): T[keyof T] | null => (isEnumMember(member, e) ? member : null);

export const enumIterator = <T extends object>(e: T): [keyof T, T[keyof T]][] =>
  Object.entries(e)
    .filter(([key]) => Number.isNaN(Number(key)))
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    .map(([key, value]) => [key as keyof T, value]);

export const isInEnum =
  <T extends { [s: string]: unknown }>(e: T) =>
  (token: unknown): token is T[keyof T] =>
    isEnumMember(token, e);
