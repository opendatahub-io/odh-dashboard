/**
 * Tracking events for the model catalog Security/Quality Insights tabs.
 * Event names are kept identical to the eval-hub constants they replace so
 * Segment reporting stays continuous.
 */

export const SECURITY_INSIGHTS_EVENTS = {
  VIEWED: 'Security Insights Viewed',
  FILTER_TYPE_CHANGED: 'Security Insights Filter Type Changed',
  FILTER_APPLIED: 'Security Insights Filter Applied',
  SORT_CHANGED: 'Security Insights Sort Changed',
  PAGINATION_CHANGED: 'Security Insights Pagination Changed',
} as const;

export const QUALITY_INSIGHTS_EVENTS = {
  VIEWED: 'Quality Insights Viewed',
  FILTER_TYPE_CHANGED: 'Quality Insights Filter Type Changed',
  FILTER_APPLIED: 'Quality Insights Filter Applied',
  SORT_CHANGED: 'Quality Insights Sort Changed',
  PAGINATION_CHANGED: 'Quality Insights Pagination Changed',
} as const;
