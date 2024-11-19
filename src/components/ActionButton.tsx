import React, {ButtonHTMLAttributes} from 'react';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
}

export default function ActionButton(props: ActionButtonProps) {
  const {
    children,
    ...otherProps
  } = props;
  return (
    <button className="action-button" style={{
      display: 'inline-flex',
      justifyContent: 'center',
      outlineWidth: 0,
      textAlign: 'center',
      padding: '6px 8px',
      minWidth: 64,
      border: 'none',
      backgroundColor: 'white',
      borderRadius: 10,
      cursor: 'pointer',
      fontFamily: 'monospace',
      fontWeight: 'bold',
    }} {...otherProps}>
      {children}
    </button>
  )
}
