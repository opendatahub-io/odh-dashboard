type GenericEnvVariableDataEntry<T> = {
  key: T;
  value: string;
}[];

export const dataEntryToRecord = <T extends string>(
  dataRecord: GenericEnvVariableDataEntry<T>,
): Partial<Record<T, string>> => {
  const initialRecord: Partial<Record<T, string>> = {};

  return dataRecord.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), initialRecord);
};
