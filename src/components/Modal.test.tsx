import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import Modal from "./Modal";

test('rendering does not crash', () => {
  render(<Modal/>);
});

test('clicking modal', () => {
  let clickedTarget: EventTarget | undefined;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    clickedTarget = e.target;
  }
  render(<Modal onClick={handleClick}/>);

  const modalEle = screen.queryByTestId('modal');
  expect(modalEle).not.toBeNull();

  if (modalEle == null) {
    throw new Error('unreachable');
  }
  fireEvent.click(modalEle);


  expect(clickedTarget).toBe(modalEle);
});
