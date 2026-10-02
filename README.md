# Sanktuary mobile

Phone companion for [sanktuary-OS](https://github.com/brahimaann/sanktuary-OS): log in with your nickname + access code,
browse Teams channels and DMs, read and send messages. Expo (React Native) + Clerk; talks to the existing
sanktuary-OS API with the Clerk session token as a Bearer header, so the server needs no changes.

## Run

1. `npm install`
2. `cp .env.example .env` and paste the Clerk publishable key.
3. In the Clerk dashboard, turn on **Native applications** (Configure > Native applications) so phones can sign in.
4. `npx expo start`, then scan the QR code with Expo Go, or press `i` / `a` for a simulator.

Messages refresh every 4 seconds while a conversation is open.

`npm test` runs the screen tests (Clerk and the server are mocked).
