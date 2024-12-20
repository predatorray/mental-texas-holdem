import React, {useCallback} from 'react';
import DataTestIdAttributes from "../lib/types";

export default function Modal(props: DataTestIdAttributes & {
  visible?: boolean;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const {
    visible,
    children,
    onClick,
  } = props;
  const modalDivRef = React.createRef<HTMLDivElement>();
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (modalDivRef.current === e.target) {
      onClick?.(e);
    }
  }, [modalDivRef, onClick]);
  return (
    <div
      ref={modalDivRef}
      className={visible ? "modal visible" : "modal"}
      onClick={handleClick}
      data-testid={props['data-testid'] ?? 'modal'}
    >
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
}
