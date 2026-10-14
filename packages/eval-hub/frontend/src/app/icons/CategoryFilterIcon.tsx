import * as React from 'react';

const CategoryFilterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    fill="none"
    viewBox="0 0 32 32"
    aria-hidden={props['aria-hidden'] ?? true}
    role="img"
    width="1em"
    height="1em"
  >
    <rect
      x="2"
      y="2"
      width="13"
      height="13"
      rx="1.5"
      fill="var(--pf-t--global--color--purple--100, #f3e8ff)"
    />
    <rect
      x="17"
      y="2"
      width="13"
      height="13"
      rx="1.5"
      fill="var(--pf-t--global--color--blue--500, #1e3a8a)"
    />
    <rect
      x="2"
      y="17"
      width="13"
      height="13"
      rx="1.5"
      fill="var(--pf-t--global--color--green--500, #166534)"
    />
    <rect
      x="17"
      y="17"
      width="13"
      height="13"
      rx="1.5"
      fill="var(--pf-t--global--color--yellow--100, #fef3c7)"
    />
  </svg>
);

export default CategoryFilterIcon;
