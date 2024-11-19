import React, { ImgHTMLAttributes } from 'react';

export default function ChipImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const {
    alt,
    className,
    ...otherAttributes
  } = props;
  return <img
    className={className ? `chip ${className}` : 'chip'}
    src={`${process.env.PUBLIC_URL}/chip.svg`}
    alt={alt ?? 'Chip'}
    {...otherAttributes}
  />;
}
