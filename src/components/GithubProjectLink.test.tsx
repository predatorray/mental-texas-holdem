import React from 'react';
import { render } from '@testing-library/react';
import GithubProjectLink from "./GithubProjectLink";

test('rendering does not crash', () => {
  render(<GithubProjectLink/>);
});
