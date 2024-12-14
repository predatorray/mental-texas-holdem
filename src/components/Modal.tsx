import React from 'react';
import DataTestIdAttributes from "../lib/types";

export default function Modal(props: DataTestIdAttributes & {
  visible?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={props.visible ? "modal visible" : "modal"}
      onClick={props.onClick}
      data-testid={props['data-testid'] ?? 'modal'}
    >
      <div className="modal-content">
        {props.children}
      </div>
    </div>
  );
}
