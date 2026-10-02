# Glossary — mobile development

**Sandbox** — the locked room the phone gives each app: its own memory and files. *In our code:* nothing to see; it's why `expo-secure-store` exists.
**Bytecode** — our code pre-translated so the engine can run it fast. *In our code:* the `.hbc` files from `expo export`.
**Component** — a function that returns a piece of screen. *In our code:* `Main`, `App.tsx:175`. *Android:* `@Composable`.
**State** — data a component remembers; changing it redraws the screen. *In our code:* `room`, `App.tsx:177`. *Android:* `mutableStateOf` / `StateFlow`.
**Request (HTTP)** — a message to a server asking for or sending data. *In our code:* `fetch`, `App.tsx:17`. *Android:* Retrofit / OkHttp.
**Token** — a pass that proves who you are, sent with each request. *In our code:* `Bearer …`, `App.tsx:19`.
