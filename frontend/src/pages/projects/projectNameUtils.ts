/** A suffix for the annotation name to allow us to filter on projects for DSG -- not to be displayed */
const DSG_ID = `[DSP]`;

export const addDSGId = (displayName: string): string => {
  if (displayName.endsWith(DSG_ID)) {
    return displayName;
  }
  return `${displayName}${DSG_ID}`;
};

export const hasDSGId = (displayName?: string): boolean => {
  return displayName?.endsWith(DSG_ID) ?? false;
};

export const stripDSGId = (displayName: string): string => {
  if (!hasDSGId(displayName)) {
    return displayName;
  }

  return displayName.slice(0, displayName.length - DSG_ID.length);
};
