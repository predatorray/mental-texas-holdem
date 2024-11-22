import {EventLog, EventLogs} from "../lib/texas-holdem/useEventLogs";
import {Message, Messages} from "../lib/useChatRoom";
import React, {useMemo} from "react";
import {convertToUnicode} from "../lib/rules";
import PlayerAvatar from "./PlayerAvatar";

function EventOrMessage(props: {
  eventOrMessage: EventLog | Message;
}) {
  const em = props.eventOrMessage;
  switch (em.type) {
    case 'message':
      return (
        <div className="message">
          <b>{em.whose}</b>: {em.text}
        </div>
      );
    case 'board':
      return (
        <div className="message">
          Board: {
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
          <PlayerAvatar playerId={em.playerId} />'s hand: {
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

export default function EventsAndMessages(props: {
  eventLogs: EventLogs;
  messages: Messages;
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
  return (
    <div className="events-and-messages">{
      eventsAndMessage.map((em, i) => <EventOrMessage key={i} eventOrMessage={em}/>) // TODO
    }</div>
  );
}
