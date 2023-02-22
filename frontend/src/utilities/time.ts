const printAgo = (time: number, unit: string) => `${time} ${unit}${time > 1 ? 's' : ''} ago`;

export const relativeTime = (current: number, previous: number): string => {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  if (isNaN(previous)) {
    return 'Just now';
  }

  const elapsed = current - previous;

  if (elapsed < msPerMinute) {
    return 'Just now';
  } else if (elapsed < msPerHour) {
    return printAgo(Math.round(elapsed / msPerMinute), 'minute');
  } else if (elapsed < msPerDay) {
    return printAgo(Math.round(elapsed / msPerHour), 'hour');
  } else if (elapsed < msPerMonth) {
    return printAgo(Math.round(elapsed / msPerDay), 'day');
  } else if (elapsed < msPerYear) {
    return printAgo(Math.round(elapsed / msPerMonth), 'month');
  }
  const date = new Date(previous);

  const month = date.getMonth();
  let monthAsString = 'Jan';
  if (month === 1) {
    monthAsString = 'Feb';
  } else if (month === 2) {
    monthAsString = 'Mar';
  } else if (month === 3) {
    monthAsString = 'April';
  } else if (month === 4) {
    monthAsString = 'May';
  } else if (month === 5) {
    monthAsString = 'June';
  } else if (month === 6) {
    monthAsString = 'July';
  } else if (month === 7) {
    monthAsString = 'August';
  } else if (month === 8) {
    monthAsString = 'Sept';
  } else if (month === 9) {
    monthAsString = 'Oct';
  } else if (month === 10) {
    monthAsString = 'Nov';
  } else if (month === 11) {
    monthAsString = 'Dec';
  }

  return `${date.getDate()} ${monthAsString} ${date.getFullYear()}`;
};
