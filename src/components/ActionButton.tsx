import React, {ButtonHTMLAttributes} from 'react';
import DataTestIdAttributes from "../lib/types";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & DataTestIdAttributes & {
  children: React.ReactNode;
}

export default function ActionButton(props: ActionButtonProps) {
  const {
    children,
    className,
    'data-testid': dataTestId,
    ...otherProps
  } = props;
  return (
    <button
      className={className ? `${className} action-button` : className}
      data-testid={dataTestId}
      {...otherProps}
    >
      {children}
    </button>
  )
}
