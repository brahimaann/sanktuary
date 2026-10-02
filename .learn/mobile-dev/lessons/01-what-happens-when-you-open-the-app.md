# Lesson 1 — What happens when you open Sanktuary

**Where it sits:** layer 1 → 7 of the map, all at once, but only the main path.

## The rule

An app is a program the phone starts when you tap its icon. Ours goes through
these steps, in order:

1. **The phone starts the app.** Android/iOS opens the app package and gives it
   a locked room (*sandbox*): its own memory and files. Other apps can't look in.
2. **The engine loads our code.** Hermes reads our code bundle (already turned
   into fast *bytecode* at build time) and runs `index.ts`, which says "the
   app's starting screen is `App`" (`index.ts:8`).
3. **React draws the first picture.** `App` (`App.tsx:183-192`) wraps
   everything in `ClerkProvider` — the login helper — then shows `Main`.
4. **`Main` picks a screen from data** (`App.tsx:175-181`):
   - login helper not ready yet → show nothing,
   - not signed in → show `SignIn`,
   - signed in, no room picked → show `Rooms`,
   - room picked → show `Chat`.
   The screen is never "navigated to". It is *recalculated* from the data.
5. **`Rooms` asks the server for the list** (`App.tsx:92-98`). It sends an
   HTTP request to `https://sanktuary.studio/api/chat` with your login token
   attached (`App.tsx:19`). When the answer comes back, it saves it, and React
   redraws the screen with the list.
6. **If anything fails,** the error text is saved instead and shown in red
   (`App.tsx:97`, `106`).

Edge cases: the phone can kill the app at any time when it's in the background
(to save memory). When you come back, it starts again at step 1 — and anything
only held in memory (like which room you had open) is gone.

## Analogy

A restaurant. The **phone** is the building manager who unlocks your kitchen.
**Hermes** is the chef who reads the recipes (our code). **React** is the waiter
who looks at the order slip (*state*) and sets the table to match. The
**server** is the supplier: the waiter phones them (*request*) and shows your
ID (*token*).

Where it breaks: a real waiter rearranges the table piece by piece. React
redraws *the whole idea* of the screen from the slip, then only changes what
differs — you never move things by hand.

## In our code

```tsx
// App.tsx:175-181
function Main() {
  const { isLoaded, isSignedIn } = useAuth();          // facts from the login helper
  const [room, setRoom] = useState<Room | null>(null); // our own fact: which room is open
  if (!isLoaded) return null;
  if (!isSignedIn) return <SignIn />;
  return room ? <Chat room={room} back={() => setRoom(null)} /> : <Rooms open={setRoom} />;
}
```

Every `return` is a picture. Change `room` and React calls `Main` again and gets
a different picture. That's the whole trick.

## New words

- **Component** — a function that returns a piece of screen. `Main`, `Rooms`, `Chat`. *Android: a `@Composable` function.*
- **State** — data a component remembers; changing it redraws the screen. `room` at `App.tsx:177`. *Android: `remember { mutableStateOf(…) }` or a `StateFlow`.*
- **Request (HTTP)** — a message the app sends to a server asking for or sending data. `fetch(…)` at `App.tsx:17`. *Android: Retrofit / OkHttp.*

## Common mistakes

1. Thinking screens are "pages you go to". In React they're *results* of data.
2. Thinking the app keeps running forever. The phone can kill it any time it's in the background.
3. Thinking the server answers instantly. Every request takes time and can fail — the app must show something meanwhile.

## Check yourself

1. You're in `#general`. You tap **‹ Back**. Which line runs, and what changes?
2. The phone kills Sanktuary while it's in the background. You reopen it. Which screen do you see, and why?

## Summary

- Phone starts app → Hermes runs our code → React draws from data.
- `Main` chooses the screen from 3 facts: loaded? signed in? room picked?
- Talking to the server is slow and can fail, so every request needs an error path.
