import React from 'react';

interface IconProps {
  path: string;
  className?: string;
  title?: string;
}

export const Icon: React.FC<IconProps> = ({ path, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    dangerouslySetInnerHTML={{ __html: path }}
  />
);
