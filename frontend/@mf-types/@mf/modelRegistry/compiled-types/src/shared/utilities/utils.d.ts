export declare const asEnumMember: <T extends object>(member: T[keyof T] | string | number | undefined | null, e: T) => T[keyof T] | null;
export declare const isEnumMember: <T extends object>(member: T[keyof T] | string | number | undefined | unknown | null, e: T) => member is T[keyof T];
