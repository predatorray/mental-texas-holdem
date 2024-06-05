import React, { useEffect, useState } from 'react';
import { EncodedDeck, Player, StandardCard, createPlayer, decodeStandardCard, encodeStandardCard, getStandard52Deck } from 'mental-poker-toolkit';

import './App.css';

import CardImage from './components/CardImage';

const useAliceAndBob = () => {
  const [alice, setAlice] = useState<Player>();
  const [bob, setBob] = useState<Player>();
  const [communityCardsEncrypted, setCommunityCardsEncrypted] = useState<bigint[]>();

  const [hands, setHands] = useState<StandardCard[]>();
  const [communityCards, setCommunityCards] = useState<Array<StandardCard | null>>([null, null, null, null, null]);

  useEffect(() => {
    const loadCommunityCards = (async () => {
      const deck = getStandard52Deck();
      const alice = await createPlayer({
        cards: deck.length,
        bits: 128,
      });
      setAlice(alice);

      const bob = await createPlayer({
        cards: deck.length,
        publicKey: alice.publicKey,
        bits: 128,
      });
      setBob(bob);

      const doubleDecrypt = (doubleEncrypted: bigint, offset: number): StandardCard => {
        const decrypted = alice!.getIndividualKey(offset).decrypt(bob!.getIndividualKey(offset).decrypt(doubleEncrypted));
        return decodeStandardCard(Number(decrypted));
      }

      const deckEncoded = new EncodedDeck(
        deck.map((card) => BigInt(encodeStandardCard(card)))
      );
      const encryptedWithKeyA = alice.encryptAndShuffle(deckEncoded);
      const encryptedWithKeyAKeyB = bob.encryptAndShuffle(encryptedWithKeyA);
      const encryptedWithIndividualKeyAKeyB = alice.decryptAndEncryptIndividually(
        encryptedWithKeyAKeyB
      );
      const encryptedBothKeysIndividually = bob.decryptAndEncryptIndividually(
        encryptedWithIndividualKeyAKeyB
      );

      setCommunityCardsEncrypted(encryptedBothKeysIndividually.cards.slice(0, 5));

      const handsEncrypted = encryptedBothKeysIndividually.cards.slice(5, 7);
      setHands([
        doubleDecrypt(handsEncrypted[0], 5),
        doubleDecrypt(handsEncrypted[1], 6),
      ]);
    });
    if (!communityCardsEncrypted) {
      loadCommunityCards();
    }
  }, [
    communityCardsEncrypted,
  ]);

  const flipCard = (offset: number) => {
    if (alice && bob && communityCardsEncrypted) {
      const cardDecrypted = bob.getIndividualKey(offset).decrypt(alice.getIndividualKey(offset).decrypt(communityCardsEncrypted[offset]));
      const newCommunityCards = [...communityCards];
      newCommunityCards[offset] = decodeStandardCard(Number(cardDecrypted));
      setCommunityCards(newCommunityCards);
    }
  };

  return {
    ready: Boolean(alice && bob),
    hands,
    communityCards,
    flipCard,
  };
};

function App() {
  const {
    ready,
    hands,
    communityCards,
    flipCard,
  } = useAliceAndBob();
  return (
    <div className="App">
      <div className="community-cards">
        {
          ready ? (
            communityCards.map((card, i) => 
              <CardImage key={i} card={card} onClick={() => flipCard(i)}/>
            )
          ) : (
            <>Shuffling the deck ...</>
          )
        }
      </div>
      
      <div className="hand-cards">
          {
            hands && hands.map((card, i) => 
              <CardImage key={i} card={card}/>
            )
          }
      </div>
    </div>
  );
}

export default App;
