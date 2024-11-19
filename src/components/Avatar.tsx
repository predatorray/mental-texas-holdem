import React, {ImgHTMLAttributes} from 'react';

type AvatarProperties =
  Pick<ImgHTMLAttributes<HTMLImageElement>,
    'alt' | 'src'>;

export default function Avatar(props: AvatarProperties) {
  const {
    alt,
    ...otherAttributes
  } = props;
  return (
    <div className="avatar" style={{
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
