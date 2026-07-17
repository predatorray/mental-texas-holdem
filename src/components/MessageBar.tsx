import {EventLog, EventLogs} from "../lib/texas-holdem/useEventLogs";
import {Message, Messages} from "../lib/useChatRoom";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import PlayerAvatar from "./PlayerAvatar";
import {rankDescription} from "phe";
import DataTestIdAttributes from "../lib/types";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import SendIcon from "@mui/icons-material/Send";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";

function EventOrMessage(props: {
  myPlayerId: string;
  eventOrMessage: EventLog | Message;
  names: Map<string, string>;
  dataTestId?: string;
}) {
  const em = props.eventOrMessage;

  const AvatarOrMe = (subProps: { whose: string }) => {
    return subProps.whose === props.myPlayerId
        ? <></>
        : <><PlayerAvatar title={props.names.get(subProps.whose)} playerId={subProps.whose}/></>
  }

  switch (em.type) {
    case 'message':
      return (
        <div className={em.whose === props.myPlayerId ? "message mime" : "message"} data-testid={props.dataTestId}>
          <AvatarOrMe whose={em.whose}/>
          <div className="name-and-message-text">
            <div className="name">
              {
                em.whose === props.myPlayerId
                  ? <>Me</>
                  : props.names.get(em.whose) || em.whose
              }
            </div>
            <div className="message-text" data-testid="message-text">{em.text}</div>
          </div>
        </div>
      );
    case 'newRound':
      return (
        <div className="message system-notification" data-testid={props.dataTestId}>Round {em.round} started</div>
      );
    case 'raise':
      return (
        <div className={em.playerId === props.myPlayerId ? "message mime system-notification" : "message system-notification"} data-testid={props.dataTestId}>
          <AvatarOrMe whose={em.playerId}/>raised / called ${em.raisedAmount}
          {
            em.allin && <b>&nbsp;ALL-IN</b>
          }
        </div>
      );
    case 'fold':
      return (
        <div className={em.playerId === props.myPlayerId ? "message mime system-notification" : "message system-notification"} data-testid={props.dataTestId}>
          <AvatarOrMe whose={em.playerId}/>fold
        </div>
      );
    case 'check':
      return (
        <div className={em.playerId === props.myPlayerId ? "message mime system-notification" : "message system-notification"} data-testid={props.dataTestId}>
          <AvatarOrMe whose={em.playerId}/>checked
        </div>
      );
    case 'winner':
      return (
        <div className="message system-notification" data-testid={props.dataTestId}>
          {
            em.result.how === 'LastOneWins' ? (
              <>
                <PlayerAvatar playerId={em.result.winner}/>:&nbsp;won.
              </>
            ) : (
              <>
                {
                  em.result.showdown[0].players.map(p => <PlayerAvatar key={p} playerId={p}/>)
                }
                :&nbsp;won ({rankDescription[em.result.showdown[0].handValue]}).
              </>
            )
          }
        </div>
      );
    case 'fund':
      return (
        <div className={em.playerId === props.myPlayerId ? "message mime system-notification" : "message system-notification"} data-testid={props.dataTestId}>
          <PlayerAvatar playerId={em.playerId}/>'s fund updated: ${em.currentAmount}&nbsp;
          {
            em.previousAmount && <>
              ({(em.currentAmount - em.previousAmount >= 0) ? '+' : '-'}${Math.abs(em.currentAmount - em.previousAmount)})
            </>
          }
          {
            em.borrowed && <>(borrowed)</>
          }
        </div>
      );
  }
}

export default function MessageBar(props: DataTestIdAttributes & {
  playerId: string;
  eventLogs: EventLogs;
  messages: Messages;
  onMessage?: (message: string) => void;
  names: Map<string, string>;
  /**
   * 'floating' (default) renders the collapsible chat panel docked to the
   * bottom-right corner (bottom sheet on small screens). 'inline' renders it
   * as a block element that fills its parent, used on the lobby page.
   */
  variant?: 'floating' | 'inline';
}) {
  const {
    playerId,
    eventLogs,
    messages,
    onMessage,
    names,
    variant = 'floating',
  } = props;
  const eventsAndMessage: Array<EventLog | Message> = useMemo(() => {
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < eventLogs.length || j < messages.length) {
      if (i >= eventLogs.length) {
        merged.push(messages[j++]);
      } else if (j >= messages.length || eventLogs[i].timestamp <= messages[j].timestamp) {
        merged.push(eventLogs[i++]);
      } else {
        merged.push(messages[j++]);
      }
    }
    return merged;
  }, [eventLogs, messages]);

  const collapsible = variant === 'floating';
  // On small screens the floating chat would cover the table, so it starts
  // collapsed there; on larger screens it starts expanded.
  const [collapsed, setCollapsed] = useState(
    () => collapsible && typeof window !== 'undefined' && window.innerWidth <= 600
  );
  const flipCollapsed = useCallback(() => {
    if (collapsible) {
      setCollapsed(collapsed => !collapsed);
    }
  }, [collapsible]);

  const [readMessageCount, setReadMessageCount] = useState<number>(0);
  useEffect(() => {
    if (!collapsed) {
      setReadMessageCount(messages.length);
    }
  }, [messages, collapsed]);
  const unreadMessageCount = useMemo(() => messages.length - readMessageCount, [messages, readMessageCount]);

  const [inputValue, setInputValue] = useState('');

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback(e => {
    setInputValue(e.target.value);
  }, []);

  const submitMessage = useCallback(() => {
    if (inputValue) {
      onMessage?.(inputValue);
      setInputValue('');
    }
  }, [inputValue, onMessage]);

  const handleInputKeyUp: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback(e => {
    if (e.key === 'Enter') {
      submitMessage();
    }
  }, [submitMessage]);

  const messagesDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const messagesDiv = messagesDivRef.current;
    messagesDiv?.scrollTo?.(0, messagesDiv.scrollHeight);
  }, [messages, eventLogs, collapsed]);

  const classNames = [
    'message-bar',
    variant === 'inline' ? 'inline' : 'floating',
    ...(collapsed ? ['collapsed'] : []),
  ].join(' ');

  return (
    <div className={classNames} data-testid={props['data-testid'] ?? 'message-bar'}>
      <div className="title-bar" onClick={flipCollapsed} data-testid="title-bar">
        <div className="profile">
          <ChatBubbleOutlineIcon fontSize="small" sx={{opacity: 0.7}}/>
          <h4>Chat</h4>
          {
            (collapsed && unreadMessageCount > 0) &&
              <Badge
                badgeContent={unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                color="primary"
                sx={{ml: 2}}
                data-testid="unread-badge"
              />
          }
        </div>
        {
          collapsible && (
            <div className="icon">
              {collapsed ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
            </div>
          )
        }
      </div>
      {
        !collapsed && (
          <>
            {
              eventsAndMessage.length === 0
                ? <div className="no-messages" data-testid="no-messages">No messages yet. Say hi!</div>
                : (
                  <div ref={messagesDivRef} className="messages">
                    {
                      eventsAndMessage.map((em, i) => <EventOrMessage
                        key={i}
                        myPlayerId={playerId}
                        names={names}
                        eventOrMessage={em}
                        dataTestId={`message-${i}`}
                      />)
                    }
                  </div>
                )
            }
            <div className="message-input-row">
              <OutlinedInput
                className="message-input-field"
                fullWidth
                size="small"
                type="text"
                placeholder="Type something..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyUp={handleInputKeyUp}
                inputProps={{'data-testid': 'message-input', className: 'message-input'}}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="send message"
                      size="small"
                      edge="end"
                      onClick={submitMessage}
                      data-testid="send-message-button"
                    >
                      <SendIcon fontSize="small"/>
                    </IconButton>
                  </InputAdornment>
                }
              />
            </div>
          </>
        )
      }
    </div>
  );
}
