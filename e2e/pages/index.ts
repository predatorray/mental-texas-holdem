/**
 * UI-independent page objects for the e2e suite.
 *
 * Specs must interact with the app only through these classes, never through
 * raw selectors, so that UI redesigns only require updating this layer. The
 * page objects in turn rely exclusively on the stable data-testid contract
 * below (plus the `alt` attribute of card images), not on CSS classes or DOM
 * structure.
 *
 * data-testid contract
 * --------------------
 * Lobby:      lobby, lobby-players, lobby-player-<i>, staging, start-button,
 *             invitation, room-link, copy-link-button, my-player-avatar,
 *             my-name-input, initial-fund-amount-input, sb-input, bb-input,
 *             encryption-key-length-option
 * Game table: table, pot, board-card-<0..4>, opponents, opponent-<i>,
 *             bankroll, my-bankroll, staging, continue-button,
 *             check-or-call-action-button, fold-action-button,
 *             raise-half-pot-action-button, raise-1-pot-action-button,
 *             raise-twice-pot-action-button, all-in-action-button,
 *             score-board-toggle, modal-close, hand-card-<0..1>, bet-amount
 * Chat:       message-bar, title-bar, message-input, send-message-button,
 *             message-<i>, message-text, no-messages
 */
export {PokerApp, createRoom} from './PokerApp';
export {LobbyPage} from './LobbyPage';
export {GameTablePage, waitForTurn, checkOrCallOnTurn} from './GameTablePage';
export {ChatPanel} from './ChatPanel';
