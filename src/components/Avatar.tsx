import React, {ImgHTMLAttributes, useMemo, useState} from 'react';

type AvatarProperties =
  Pick<ImgHTMLAttributes<HTMLImageElement>,
    'alt' | 'src' | 'className' | 'title'> & {
  highlight?: boolean;
};

export const PLACEHOLDER_SRC = `${process.env.PUBLIC_URL}/avatar-placeholder.svg`

export default function Avatar(props: AvatarProperties) {
  const {
    alt,
    src,
    ...otherAttributes
  } = props;

  const [error, setError] = useState<boolean>(false);

  const actualSrc = useMemo(() => {
    return error ? PLACEHOLDER_SRC : src;
  }, [error, src]);

  return (
    <div className={props.highlight ? 'avatar highlight' : 'avatar'}>
      <img alt={props.alt ?? "Avatar"} src={actualSrc} {...otherAttributes} onError={() => setError(true)}/>
    </div>
  );
}
