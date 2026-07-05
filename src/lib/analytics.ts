/**
 * Thin wrapper around Google Analytics (gtag.js).
 *
 * All game and connection telemetry goes through this module so that:
 * - analytics can never break the game (failures are swallowed),
 * - environments without gtag (unit tests, local dev) are silent no-ops,
 * - event names and parameters stay consistent and greppable in one place.
 *
 * GA4 limits event parameter values to 100 characters, so free-form
 * strings (error messages etc.) are truncated before sending.
 */

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

const MAX_PARAM_LENGTH = 100;

export function trackEvent(name: string, params?: AnalyticsParams) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
  } catch (e) {
    console.debug('Failed to send the analytics event.', e);
  }
}

/**
 * Reports an error condition to GA as an `app_error` event.
 * @param source a short, stable identifier of where the error occurred
 * @param error the error object or message
 * @param params extra parameters to attach
 */
export function trackError(source: string, error: unknown, params?: AnalyticsParams) {
  const description = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
  trackEvent('app_error', {
    error_source: source,
    description: description.slice(0, MAX_PARAM_LENGTH),
    ...params,
  });
}
