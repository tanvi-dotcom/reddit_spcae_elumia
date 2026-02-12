# Space Elumia 🚀

> A high-octane retro space shooter built for the Reddit Developer Platform.

![banner](https://github.com/user-attachments/assets/d2b1c717-6b1c-4222-b492-6abfb3fee15e)


## Inspiration 💡
Our inspiration came from the golden age of arcade shooters—games like *Galaga*, *Space Invaders*, and *R-Type*. We wanted to bring that same frenetic, edge-of-your-seat excitement to the Reddit platform, proving that complex, high-performance web games can thrive directly within a Reddit post. The name "Elumia" evokes a sense of cosmic mystery, setting the stage for an epic interstellar journey.

## What it does 🎮
**Space Elumia** is a browser-based vertical scrolling shooter where players pilot a customizable ship through treacherous alien territories.
*   **Endless Action:** Fight against waves of diverse alien enemies and hazardous asteroids.
*   **Epic Boss Battles:** Confront massive bosses like "The Watcher" and "The Kraken" every 5 levels.
*   **Responsive Controls:** Seamlessly switch between keyboard (WASD/Space) for desktop and intuitive touch/tilt controls for mobile play.
*   **Global Leaderboards:** Compete with other redditors for the top spot on the high-score table.
*   **Progression:** Level up, unlock power-ups (Missiles, Shields), and face increasing difficulty, including a "Hard Mode" for veterans.

## How we built it 🛠️
We built Space Elumia using a modern web stack optimized for performance and developer experience:
*   **[Devvit](https://developers.reddit.com/):** The core platform for hosting the app and bridging the gap between our game and Reddit's ecosystem (Auth, KV Store for Leaderboards).
*   **[React](https://react.dev/):** Used for the UI layer, managing the HUD, menus, and application state.
*   **[HTML5 Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API):** We implemented a custom game loop and rendering engine on top of Canvas for silky smooth 60 FPS gameplay, avoiding the overhead of heavy game engines.
*   **[Hono](https://hono.dev/):** A lightweight backend framework used to build our internal API routes for score submission and leaderboard retrieval.
*   **[Tailwind CSS](https://tailwindcss.com/):** For rapid styling of the game interface, menus, and responsive layouts.
*   **[Vite](https://vite.dev/):** For lightning-fast builds and hot module replacement during development.

## Challenges we ran into 🚧
*   **Performance Optimization:** rendering hundreds of particles (stars, bullets, enemies) in a browser webview required careful optimization of the render loop and object pooling to prevent garbage collection stutter.
*   **Mobile Adaptation:** Detecting orientation changes and re-mapping coordinate systems for touch controls was tricky. We implemented a custom hook `useIsPortrait` to handle device rotation and provide a seamless mobile experience.
*   **State Management:** Balancing React's state (for HUD/UI) with the mutable game state (for the 60fps loop) required a "dual-state" approach using `useRef` for high-frequency game logic and `useState` for UI updates.
*   **Platform Constraints:** Working within the constraints of an embedded frame meant we had to be clever about resolution scaling and asset loading.

## Accomplishments that we're proud of 🏆
*   **Cross-Platform Smoothness:** The game feels just as good on a phone as it does on a desktop.
*   **Dynamic Boss System:** Creating unique behaviors and health bars for boss encounters adds a layer of depth often missing in simple web shooters.
*   **Integrated Leaderboards:** Successfully connecting the game to a persistent backend DB allows the community to compete in real-time.
*   **Visual Polish:** The glowing neon aesthetics, parallax starfields, and retro CRT vibes make the game visually popping.

## What we learned 📚
*   **Game Loop Mechanics:** We deepened our understanding of `requestAnimationFrame` and delta-time based movement to ensure consistent speeds across different refresh rates.
*   **React + Canvas:** We learned effective patterns for marrying React's declarative nature with Canvas's imperative drawing context.
*   **Reddit Dev Platform:** We gained valuable experience with the Devvit CLI, KV storage, and the lifecycle of Reddit Apps.

## What's next for Space Elumia 🔮
*   **Multiplayer Co-op:** Two pilots, one screen (or networked!).
*   **Ship Customization:** Unlockable skins and weapon types using Reddit Karma or game points.
*   **More Bosses:** Expanding the rogue's gallery with even more challenging mechanics.
*   **Soundtrack:** Adding an original synth-wave score to enhance the atmosphere.

---

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run type-check`: Type checks, lints, and prettifies your app
