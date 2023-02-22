export const getFullStatusFromPercentage = (percentageFull: number): string | null => {
  if (percentageFull === 100) {
    return 'error';
  } else if (percentageFull >= 95) {
    return 'warning';
  } else if (percentageFull >= 90) {
    return 'info';
  } else {
    return null;
  }
};
