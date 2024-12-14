import React, { ImgHTMLAttributes } from 'react';
import DataTestIdAttributes from "../lib/types";

export default function ChipImage(props: DataTestIdAttributes & ImgHTMLAttributes<HTMLImageElement>) {
  const {
    alt,
    className,
    'data-testid': dataTestId,
    ...otherAttributes
  } = props;
  return <img
    className={className ? `chip ${className}` : 'chip'}
    src={`${process.env.PUBLIC_URL}/chip.svg`}
    alt={alt ?? 'Chip'}
    data-testid={dataTestId ?? 'chip'}
    {...otherAttributes}
  />;
}
