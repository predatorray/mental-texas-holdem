# Mental Texas Hold'em

![License](https://img.shields.io/github/license/predatorray/mental-texas-holdem)
![Build Status](https://img.shields.io/github/actions/workflow/status/predatorray/mental-texas-holdem/ci.yml?branch=master)
[![codecov](https://codecov.io/github/predatorray/mental-texas-holdem/graph/badge.svg?token=WM14oj4huI)](https://codecov.io/github/predatorray/mental-texas-holdem)

![screenshot](https://github.com/predatorray/mental-texas-holdem/blob/assets/screenshot.png?raw=true)

A **Peer-to-Peer**, **serverless** Texas Hold'em game that runs purely on browsers using WebRTC.

A live demo is available [here](https://www.predatorray.me/mental-texas-holdem/).

## Highlights

### Serverless

The game leverages a WebRTC framework called [PeerJS](https://peerjs.com), 
where no peer-to-peer data goes through the server once connections are established.
Techinically, there is no "Game Server" running in the background,
but instead, every player is engaged in "server"ing the game,
even including shuffling the deck and dealing cards.
The host, who creates the game, merely acts as a hub that proxies the data sent by those
who join the game later.

![serverless](https://github.com/predatorray/mental-texas-holdem/blob/assets/serverless-diagram.png?raw=true)

### Fairness

So, you may ask, *is it still a fair game*? Well, here is the most interesting part of this project.

Fairness is guaranteed by using an algorithm that solves a cryptographic problem called **Mental Poker**,
where a fair poker game can still be played without a trusted third party.

Though, a more detailed explanation of the algorithm can be found on
[its Wikipedia page](https://en.wikipedia.org/wiki/Mental_poker),
here is a brief summary:

1. There are two players Alice and Bob.
2. Alice and Bob shuffle and encrypt the deck one after another using commutative encryption algorithm.
3. And then, they decrypt the deck using their private key and encrypt again each card individually using different keys.
4. Finally, the deck is shuffled and double-encrypted by Alice and Bob.
   Unless both Alice and bob agree to share their own private keys of a card, no one knows, even Alice or Bob.

The Commutative encryption algorithm above can be described as the following,

$$
\begin{align*}c &= &f_{k_2}(f_{k_1}(m)) &\equiv& f_{k_1}(f_{k_2}(m))\\\\m &= &f_{k_2}^{-1}(f_{k_1}^{-1}(c)) &\equiv& f_{k_1}^{-1}(f_{k_2}^{-1}(c))\end{align*}
$$

where,
- $m$ is plaintext,
- $c$ is double-encrypted ciphertext,
- $k_1$ is Alice's key,
- $k_2$ is Bob's key,
- $f_{k_n}$ is the encryption using key $n$,
- $f_{k_n}^{-1}$ is the decryption using key $n$.

The implementation of the algorithm can be found in this separate project:
[predatorray/mental-poker-toolkit](https://github.com/predatorray/mental-poker-toolkit),
and it is also available on [NPM](https://www.npmjs.com/package/mental-poker-toolkit).

## Limitations

### Fault Tolerance

If a peer disconnects or leaves the game, the game won't be able to continue.
There is no persistence or recovery mechanism implemented yet.

### Performance

SRA, a RSA variant, is used as the commutative encryption algorithm described above.
Its encryption and decryption consume a lot of CPU resource,
especially when a large key length (e.g. > 128 bits) is used.
Running such computation on a browser using Javascript is relatively slow comparing to
other native applications.

Besides that, since the deck is double-encrypted using SRA,
the size of ciphertext could grow exponentially with the key length.
Thus, network could be a bottleneck if key length is too large, which finally causes
huge latency when shuffling the deck.

## Support & Bug Report

Please feel free to [open an issue](https://github.com/predatorray/mental-texas-holdem/issues/new)
if you find any bug or have any suggestion.

## License

[MIT License](LICENSE)
