type Status = 'error' | 'warning' | 'info' | null;
export const getFullStatusFromPercentage = (percentageFull: number): Status => {
  if (percentageFull === 100) {
    return 'error';
  }
  if (percentageFull >= 95) {
    return 'warning';
  }
  if (percentageFull >= 90) {
    return 'info';
  }
  return null;
};
