import {EventLog, EventLogs} from "../lib/texas-holdem/useEventLogs";
import {Message, Messages} from "../lib/useChatRoom";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {convertToUnicode} from "../lib/rules";
import PlayerAvatar from "./PlayerAvatar";

function EventOrMessage(props: {
  myPlayerId: string;
  eventOrMessage: EventLog | Message;
}) {
  const em = props.eventOrMessage;
  switch (em.type) {
    case 'message':
      return (
        <div className={em.whose === props.myPlayerId ? "message mime" : "message"}>
          {
            em.whose === props.myPlayerId
              ? <b>Me:</b>
              : <><PlayerAvatar playerId={em.whose}/>:</>
          }
          <div className="message-text">{em.text}</div>
        </div>
      );
    case 'board':
      return (
        <div className="message">
          <b>Board:</b> {
            em.board
              .map(card => {
                const cardUnicode = convertToUnicode(card);
                return <span className={`card-char ${card.suit.toLowerCase()}`}>{cardUnicode}</span>
              })
          }
        </div>
      );
    case 'hole':
      return (
        <div className="message">
          <PlayerAvatar playerId={em.playerId} />: {
          em.hole
            .map(card => {
              const cardUnicode = convertToUnicode(card);
              return <span className={`card-char ${card.suit.toLowerCase()}`}>{cardUnicode}</span>
            })
        }
        </div>
      );
    case "newRound":
      return <></>; // TODO
  }
}

export default function MessageBar(props: {
  playerId: string;
  eventLogs: EventLogs;
  messages: Messages;
  onMessage?: (message: string) => void;
}) {
  const {
    eventLogs,
    messages,
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

  const [collapsed, setCollapsed] = useState(false);
  const flipCollapsed = useCallback(() => setCollapsed(collapsed => !collapsed), []);

  const [inputValue, setInputValue] = useState('');

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(e => {
    setInputValue(e.target.value);
  }, []);

  const handleInputKeyUp: React.KeyboardEventHandler<HTMLInputElement>  = useCallback(e => {
    if (e.key === 'Enter' && inputValue) {
      props.onMessage?.(inputValue);
      setInputValue('');
    }
  }, [inputValue]);

  const messagesDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const messagesDiv = messagesDivRef.current;
    if (!messagesDiv) {
      return;
    }
    messagesDiv.scrollTo(0, messagesDiv.scrollHeight);
  }, [messages]);

  return (
    <div className={collapsed ? "message-bar collapsed" :  "message-bar"}>
      <div className="title-bar" onClick={flipCollapsed}>
        <div className="profile">
          <PlayerAvatar playerId={props.playerId}/>
          <a>Messages</a>
        </div>
        <div className="icon">
          <p style={{transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)'}}>❮</p>
        </div>
      </div>
      {
        eventsAndMessage.length === 0
          ? <div className="no-messages">No messages.</div>
          : (
            <div ref={messagesDivRef} className="messages">
              {
                eventsAndMessage.map((em, i) => <EventOrMessage key={i} myPlayerId={props.playerId} eventOrMessage={em}/>)
              }
            </div>
          )
      }
      <input className="message-input"
             type="text"
             placeholder="Type something..."
             value={inputValue}
             onChange={handleInputChange}
             onKeyUp={handleInputKeyUp}/>
    </div>
  );
}
