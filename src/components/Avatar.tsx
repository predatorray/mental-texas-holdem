import React, {ImgHTMLAttributes} from 'react';

type AvatarProperties =
  Pick<ImgHTMLAttributes<HTMLImageElement>,
    'alt' | 'src' | 'className'> & {
  highlight?: boolean;
};

export default function Avatar(props: AvatarProperties) {
  const {
    alt,
    ...otherAttributes
  } = props;
  return (
    <div className={props.highlight ? 'avatar highlight' : 'avatar'} style={{
      display: 'flex',
      justifyContent: 'center',
      borderTopLeftRadius: '50%',
      borderTopRightRadius: '50%',
      borderBottomLeftRadius: '50%',
      borderBottomRightRadius: '50%',
    }}>
      <img alt={props.alt ?? "Avatar"} {...otherAttributes}/>
    </div>
  );
}
