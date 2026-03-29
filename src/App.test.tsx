import {render} from "@testing-library/react";
import React from "react";
import App from "./App";

jest.mock('./lib/setup');

test('rendering does not crash', () => {
  render(<App />);
});
