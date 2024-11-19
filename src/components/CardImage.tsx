import React, { ImgHTMLAttributes } from 'react';
import { StandardCard } from 'mental-poker-toolkit';

export type CardImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  card?: StandardCard | null;
};

export default function CardImage(props: CardImageProps) {
  if (!props.card) {
    const {
      alt,
      className,
      ...otherAttributes
    } = props;
    return <img className={className ? `card ${className}` : 'card'} src={`${process.env.PUBLIC_URL}/cards/back.svg`} alt={alt ?? 'Back'} {...otherAttributes}/>;
  }

  const {
    alt,
    className,
    card,
    ...otherAttributes
  } = props;
  
  const src = `${process.env.PUBLIC_URL}/cards/${(card.suit.charAt(0) + card.rank).toLowerCase()}.svg`;
  return <img className={className ? `card ${className}` : 'card'} src={src} alt={alt ?? (card.suit + card.rank)} {...otherAttributes}/>;
}
