import React from 'react';

export default function Modal(props: {
  visible?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={props.visible ? "modal visible" : "modal"} onClick={props.onClick}>
      <div className="modal-content">
        {props.children}
      </div>
    </div>
  );
}
