import React, {useCallback, useState} from "react";
import PlayerAvatar from "./PlayerAvatar";

export default function MyPlayerAvatar(props: {
  playerId: string | undefined;
  names: Map<string, string>;
  setMyName: (name: string) => void;
}) {
  const {
    playerId,
    names,
    setMyName,
  } = props;

  const [nameInputValue, setNameInputValue] = useState('');

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(e => {
    setNameInputValue(e.target.value);
  }, []);

  const handleInputKeyUp: React.KeyboardEventHandler<HTMLInputElement>  = useCallback(e => {
    if (e.key === 'Enter' && nameInputValue) {
      setChangingName(false);
      setMyName(nameInputValue);
    }
  }, [setMyName, nameInputValue]);

  const [changingName, setChangingName] = useState<boolean>(false);

  if (!playerId) {
    return <></>;
  }

  const playerName = names.get(playerId);
  if (playerName && !changingName) {
    return (
      <PlayerAvatar playerId={playerId}>
        <span className="clickable" onClick={() => setChangingName(true)}>{playerName}</span>
      </PlayerAvatar>
    );
  }

  return (
    <PlayerAvatar playerId={playerId} data-testid="my-player-avatar">
      <input className="name-input"
             type="text"
             placeholder="Enter your name..."
             value={nameInputValue}
             onChange={handleInputChange}
             onKeyUp={handleInputKeyUp}
             onFocus={(e) => e.target.setSelectionRange(0, e.target.value.length)}
             autoFocus={true}
             data-testid="my-name-input"
      />
    </PlayerAvatar>
  );
}
