import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import Invitation from "./Invitation";

describe("Invitation", () => {
  let writeText = jest.fn();

  beforeEach(() => {
    writeText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });
    writeText.mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    writeText.mockReset();
  })

  test('rendering does not crash', () => {
    render(<Invitation hostPlayerId="player"/>);
  });

  test('copy the link', async () => {
    render(<Invitation hostPlayerId="player"/>);

    const copyButton = screen.getByTestId('copy-link-button');
    expect(copyButton).toBeVisible();

    expect(copyButton).toHaveTextContent('Copy');

    fireEvent.click(copyButton);
    expect(writeText).toHaveBeenCalled();

    await waitFor(() => {
      expect(copyButton).toHaveTextContent('Copied');
    });

    await waitFor(() => {
      expect(copyButton).toHaveTextContent('Copy');
    }, {
      timeout: 5500,
    });
  }, 6000);
});
