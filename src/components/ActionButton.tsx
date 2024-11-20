import React, {ButtonHTMLAttributes} from 'react';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
}

export default function ActionButton(props: ActionButtonProps) {
  const {
    children,
    className,
    ...otherProps
  } = props;
  return (
    <button className={className ? `${className} action-button` : className} {...otherProps}>
      {children}
    </button>
  )
}
