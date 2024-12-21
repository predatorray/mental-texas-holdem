import {combination} from "./utils";

describe('combination', () => {
  test('2 combination of 2', () => {
    const input = [1, 2];
    const output = combination(input, 2);
    expect(output).toEqual([
      [1, 2],
    ]);
  });

  test('1 combination of 2', () => {
    const input = [1, 2];
    const output = combination(input, 1);
    expect(output).toEqual([
      [1],
      [2],
    ]);
  });

  test('2 combination of 3', () => {
    const input = [1, 2, 3];
    const output = combination(input, 2);
    expect(output).toEqual([
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
  });

  test('3 combination of 5', () => {
    const input = [1, 2, 3, 4, 5];
    const output = combination(input, 3);
    expect(output).toEqual([
      [1, 2, 3],
      [1, 2, 4],
      [1, 2, 5],
      [1, 3, 4],
      [1, 3, 5],
      [1, 4, 5],
      [2, 3, 4],
      [2, 3, 5],
      [2, 4, 5],
      [3, 4, 5],
    ]);
  });

  test('0 combination of 1', () => {
    const input = [1];
    const output = combination(input, 0);
    expect(output).toEqual([]);
  });

  test('2 combination of 1', () => {
    const input = [1];
    const output = combination(input, 2);
    expect(output).toEqual([]);
  });
});
