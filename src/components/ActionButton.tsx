import React, {ButtonHTMLAttributes} from 'react';
import Button from '@mui/material/Button';
import DataTestIdAttributes from "../lib/types";

type ActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & DataTestIdAttributes & {
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
    <Button
      variant="outlined"
      color="inherit"
      size="small"
      className={className ? `${className} action-button` : 'action-button'}
      data-testid={dataTestId}
      {...otherProps}
    >
      {children}
    </Button>
  )
}
