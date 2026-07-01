import {trackEvent, trackError} from './analytics';

describe('analytics', () => {
  afterEach(() => {
    delete (window as any).gtag;
  });

  test('trackEvent is a no-op when gtag is not defined', () => {
    expect(() => trackEvent('some_event', {foo: 'bar'})).not.toThrow();
  });

  test('trackEvent forwards to gtag when defined', () => {
    const gtagMock = jest.fn();
    (window as any).gtag = gtagMock;

    trackEvent('round_start', {round: 1, players_count: 2});

    expect(gtagMock).toHaveBeenCalledWith('event', 'round_start', {
      round: 1,
      players_count: 2,
    });
  });

  test('trackEvent swallows gtag errors', () => {
    (window as any).gtag = () => {
      throw new Error('gtag blew up');
    };
    expect(() => trackEvent('some_event')).not.toThrow();
  });

  test('trackError reports app_error with truncated description', () => {
    const gtagMock = jest.fn();
    (window as any).gtag = gtagMock;

    trackError('game_room', new Error('x'.repeat(200)), {round: 3});

    expect(gtagMock).toHaveBeenCalledTimes(1);
    const [command, name, params] = gtagMock.mock.calls[0];
    expect(command).toBe('event');
    expect(name).toBe('app_error');
    expect(params.error_source).toBe('game_room');
    expect(params.round).toBe(3);
    expect(params.description.length).toBeLessThanOrEqual(100);
    expect(params.description.startsWith('Error: xxx')).toBe(true);
  });

  test('trackError stringifies non-Error values', () => {
    const gtagMock = jest.fn();
    (window as any).gtag = gtagMock;

    trackError('somewhere', 'plain message');

    expect(gtagMock.mock.calls[0][2].description).toBe('plain message');
  });
});
