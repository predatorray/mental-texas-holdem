# Mental Texas Hold'em

![License](https://img.shields.io/github/license/predatorray/mental-texas-holdem)
![Build Status](https://img.shields.io/github/actions/workflow/status/predatorray/mental-texas-holdem/ci.yml?branch=master)
[![codecov](https://codecov.io/github/predatorray/mental-texas-holdem/graph/badge.svg?token=WM14oj4huI)](https://codecov.io/github/predatorray/mental-texas-holdem)

![screenshot](https://github.com/predatorray/mental-texas-holdem/blob/assets/screenshot.png?raw=true)

Mental Texas Hold'em is a **Peer-to-Peer**, **serverless** Texas Hold'em game that runs purely in browsers using WebRTC.

Play a live demo [here](https://www.predatorray.me/mental-texas-holdem/).

## Highlights

### Serverless

The game leverages a WebRTC framework called [PeerJS](https://peerjs.com),
where no peer-to-peer data goes through the server once connections are established.
Technically, there is no "Game Server" running in the background.
Instead, every player is involved in "serving" the game,
including shuffling the deck and dealing cards.
The host, who creates the game, merely acts as a hub that proxies the data sent by those
who join the game later.

![serverless](https://github.com/predatorray/mental-texas-holdem/blob/assets/serverless-diagram.png?raw=true)

### Fairness

You may ask, *is it still a fair game*? Well, here is the most interesting part of this project.

The game ensures fairness using a cryptographic protocol called **Mental Poker**,
which allows two or more players to play a fair game of poker without a trusted third party.

For a full explanation, you can check out the [Mental Poker Wikipedia](https://en.wikipedia.org/wiki/Mental_poker).
Here’s a simplified overview:

1. There are two players, Alice and Bob.
2. Alice and Bob shuffle and encrypt the deck one after another using a commutative encryption algorithm.
3. Then, they decrypt the deck using their private keys and encrypt each card individually using different keys.
4. Finally, the deck is shuffled and double-encrypted by Alice and Bob.
   No player can view the card values unless both players agree to share their private keys for a card.

The commutative encryption algorithm can be described as follows:

$$
\begin{align*}c &= &f_{k_2}(f_{k_1}(m)) &\equiv& f_{k_1}(f_{k_2}(m))\\\\m &= &f_{k_2}^{-1}(f_{k_1}^{-1}(c)) &\equiv& f_{k_1}^{-1}(f_{k_2}^{-1}(c))\end{align*}
$$

where,
- $m$ is the plaintext (the Card),
- $c$ is the double-encrypted ciphertext,
- $k_1$ and $k_2$ are the keys of the players Alice and Bob,
- $f_{k_n}$ and $f_{k_n}^{-1}$ are the encryption and decryption functions using key $k_n$,

This cryptographic protocol guarantees that no one can know the card values until they mutually decrypt the deck.

This protocol is implemented in the separate project: [mental-poker-toolkit](https://github.com/predatorray/mental-poker-toolkit),
also available on [NPM](https://www.npmjs.com/package/mental-poker-toolkit).

## Limitations

### Fault Tolerance

Currently, there is no fault tolerance implemented. If a peer disconnects or leaves the game,
the game will be interrupted, and no recovery mechanism is in place.

### Performance

The game uses SRA, a variant of RSA, as the commutative encryption algorithm.
This encryption and decryption process can be CPU-intensive, particularly with large key sizes
(e.g., greater than 128 bits).

Since these cryptographic operations are run in the browser using JavaScript,
performance may be slower compared to native applications.
Additionally, the ciphertext size increases exponentially with key size,
potentially causing network latency during deck shuffling if the key length is too large.

## Support & Bug Report

If you find any bugs or have suggestions, please feel free to [open an issue](https://github.com/predatorray/mental-texas-holdem/issues/new).

## License

This project is licensed under the [MIT License](LICENSE).
