# Mobile development — the map

**What this field solves:** putting software in people's pockets. A phone app
has to look right on many screen sizes, keep working when the signal drops, save
battery, keep secrets safe, and survive the phone killing it at any moment.
Companies pay for people who can do all of that *reliably* — and prove it with
tests.

**Our textbook:** Sanktuary, a chat app built with **React Native** (via Expo),
written in **TypeScript**. Your roadmap is written for **native Android**
(Kotlin + Jetpack Compose). The ideas are the same; the names differ. Every idea
below gets both names.

## The layers, bottom-up

| # | Layer | Plain meaning | In Sanktuary |
|---|---|---|---|
| 1 | Phone + OS (Android / iOS) | The boss. Runs apps, gives each a locked room (sandbox), kills them to save battery. | Not ours — we just live in it. |
| 2 | App package (APK / IPA) | The installable box the app ships in. | Expo builds it from `app.json`. |
| 3 | JS engine (Hermes) | A machine inside the app that runs our code. | Our bundles were `.hbc` = Hermes bytecode. |
| 4 | React Native | The translator: turns `<Text>` into a real Android/iOS text view. | `import … from 'react-native'` (`App.tsx:2`) |
| 5 | React | Decides *what* should be on screen from the current data. | Every `function X()` that returns `<…>` |
| 6 | Our code | Screens, rules, talking to the server. | `App.tsx` |
| 7 | Server + login service | Where the real data lives; who you are. | sanktuary-OS (`App.tsx:7`), Clerk (`App.tsx:4`) |

## 20 / 60 / 20

**Learn now (20%)** — in this order, each with a tiny deliverable:

1. What an app is & what happens when you open ours → trace it (lesson 1)
2. Components and state (the screen is a picture of your data) → add a message counter
3. Effects & lifecycle (doing things when a screen appears / disappears) → explain `App.tsx:129-133`
4. Talking to a server (async, HTTP, tokens) → add a request timeout
5. Screen states: loading / error / ready → replace loose strings with one state type
6. Testing → write one new test that fails before your fix

**Skip for now (60%)** — feels productive, isn't yet: animations, custom native
modules, Gradle internals, Baseline Profiles, R8 rules, state libraries
(Redux etc.), Kotlin Multiplatform, design-system theory.

**Learn later (20%)** — after the "now" list, these are the enterprise must-haves:
offline-first local database, background work & push notifications,
architecture layers + dependency injection, CI (tests on every push),
crash reporting, performance profiling, and native Kotlin Android.

## Same idea, two names (your roadmap ↔ our app)

| Idea in plain words | Native Android name | Sanktuary (React Native) | Have it? |
|---|---|---|---|
| Do slow work without freezing the screen | Coroutines, `suspend` | `async`/`await`, Promises (`App.tsx:16-22`) | ✅ |
| Cancel work when the user leaves | Structured concurrency, `Job` cancel | Effect cleanup (`App.tsx:132`) — stops the timer, but not a request already in flight | 🟡 |
| A list of only-these-states (loading/error/ready) | `sealed interface` | TypeScript union type | ❌ we use loose strings |
| A value that keeps updating over time | `Flow` / `StateFlow` | polling every 4 s (`App.tsx:131`) + `useState` | 🟡 polling, not a stream |
| Screen described from data | Jetpack Compose | React components | ✅ |
| Remember a value between redraws | `remember` / `rememberSaveable` | `useState` / `useRef` | ✅ / ❌ (lost if the app is killed) |
| Parent owns the data, child just asks | State hoisting | `Main` owns `room`, passes `open`/`back` (`App.tsx:177-180`) | ✅ |
| Run something when a screen shows; clean up after | `LaunchedEffect` / `DisposableEffect` | `useEffect` + return cleanup (`App.tsx:129-133`) | ✅ |
| Screen-reader labels, big enough buttons | Semantics / a11y | `accessibilityLabel`, `accessibilityRole` | 🟡 buttons only |
| One look across the app, dark mode | Material 3 theme | `StyleSheet` (`App.tsx:194`), light only | ❌ |
| Keep UI, rules and data apart | Clean Architecture | everything in one file | ❌ |
| A screen's brain, separate from its looks | ViewModel | a custom hook (e.g. `useChat`) | ❌ logic sits in the screen |
| Split the app into parts | Multi-module Gradle | folders | ❌ (one file) |
| Hand parts what they need instead of building it themselves | Hilt (DI) | React Context / passing in; `useApi` (`App.tsx:13`) | 🟡 |
| Swap real parts for fakes in tests | `@TestInstallIn`, MockK | `jest.mock` (`App.test.tsx:7-13`) | ✅ |
| Local database on the phone | Room | `expo-sqlite` | ❌ nothing saved |
| Show saved data first, refresh in background | Offline-first repository | — | ❌ |
| Add the login token to every request | OkHttp interceptor | `useApi` adds `Bearer` (`App.tsx:19`) | ✅ |
| Give up on a slow request, retry | OkHttp timeouts / retry | — | ❌ |
| Check the server's data is the right shape | Kotlinx Serialization | `res.json()` trusted as-is (`App.tsx:22`) | ❌ |
| UI tests | Compose test rule | React Native Testing Library (`App.test.tsx`) | ✅ |
| Test a stream's values in order | Turbine | polling test (`App.test.tsx`) | 🟡 |
| Test the database in memory | Room in-memory DB | — | ❌ no DB yet |
| Work while the app is closed | WorkManager | `expo-background-task`, push notifications | ❌ |
| Start fast | Baseline Profiles | Hermes bytecode (on by default) | ✅ |
| Shrink & protect the release build | R8 / ProGuard | Hermes + minified bundle; R8 on the Android shell | 🟡 default |
| Tests run on every push | CI | — | ❌ |
| Know when the app crashes for users | Crash reporting | — | ❌ |
| Keep the login token safe | Keystore / EncryptedPrefs | `expo-secure-store` via `tokenCache` (`App.tsx:5`) | ✅ |

## Common confusions

- **React vs React Native** — React decides *what* to show; React Native *draws* it on a phone.
- **State vs props** — state is data a component owns; props is data handed to it.
- **Polling vs streaming** — polling asks "anything new?" every few seconds; streaming keeps a line open and the server pushes.
- **Cache vs database** — a cache is a disposable copy for speed; a database is the place data is kept on purpose.
- **Unit vs UI vs integration test** — one function / one screen / several real parts together.
