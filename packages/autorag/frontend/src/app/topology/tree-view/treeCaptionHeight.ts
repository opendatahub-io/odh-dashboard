import * as React from 'react';

/** Minimum foreignObject caption heights — match prior fixed layout for typical single-line content. */
export const getCaptionHeightBounds = (
  showExpandToggle: boolean,
  hasSubtitle: boolean,
  isColumnHeader = false,
): { min: number; max: number } => {
  if (showExpandToggle) {
    return { min: 80, max: 120 };
  }
  if (isColumnHeader) {
    return { min: 44, max: 72 };
  }
  if (hasSubtitle) {
    return { min: 52, max: 80 };
  }
  return { min: 36, max: 48 };
};

type UseBoundedCaptionHeightOptions = {
  showExpandToggle: boolean;
  labelSubtitle: string | undefined;
  label: string | undefined;
  labelWidth: number;
  expandToggleExpanded?: boolean;
  isColumnHeader?: boolean;
};

/**
 * Sizes the topology node caption foreignObject from measured wrapped content,
 * clamped so short labels keep prior layout and long names do not grow without bound.
 */
export const useBoundedCaptionHeight = (
  options: UseBoundedCaptionHeightOptions,
): [number, React.RefObject<HTMLDivElement>] => {
  const {
    showExpandToggle,
    labelSubtitle,
    label,
    labelWidth,
    expandToggleExpanded,
    isColumnHeader,
  } = options;
  const hasSubtitle = Boolean(labelSubtitle);
  const { min, max } = getCaptionHeightBounds(showExpandToggle, hasSubtitle, isColumnHeader);
  const captionRef = React.useRef<HTMLDivElement>(null);
  const [captionHeight, setCaptionHeight] = React.useState(min);

  React.useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el) {
      setCaptionHeight(min);
      return;
    }
    const measured = Math.ceil(el.scrollHeight);
    setCaptionHeight(Math.min(max, Math.max(min, measured)));
  }, [
    min,
    max,
    label,
    labelSubtitle,
    showExpandToggle,
    labelWidth,
    expandToggleExpanded,
    isColumnHeader,
  ]);

  return [captionHeight, captionRef];
};
