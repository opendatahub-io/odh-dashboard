type CategoryColor = 'orange' | 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'yellow';

const CATEGORY_COLOR_PALETTE: CategoryColor[] = [
  'blue',
  'teal',
  'green',
  'purple',
  'orange',
  'red',
  'yellow',
];

export const getCategoryColor = (category?: string): CategoryColor => {
  if (!category) {
    return 'blue';
  }
  const hash = category
    .toLowerCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
};

export const VISIBLE_METRICS_COUNT = 3;
