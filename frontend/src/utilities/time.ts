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
    return `${Math.round(elapsed / msPerMinute)} minutes ago`;
  } else if (elapsed < msPerDay) {
    return `${Math.round(elapsed / msPerHour)} hours ago`;
  } else if (elapsed < msPerMonth) {
    const days = Math.round(elapsed / msPerDay);
    if (days > 1) return `${days} days ago`;
    else return `${days} day`;
  } else if (elapsed < msPerYear) {
    const months = Math.round(elapsed / msPerMonth);
    if (months > 1) return `${months} months ago`;
    else return `${months} months`;
  } else {
    const date = new Date(current);

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
  }
};
