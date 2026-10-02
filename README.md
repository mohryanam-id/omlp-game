# One More Unicorn

A static browser game: guide the queen, collect unicorns, avoid lions, and survive for 1, 2, or 3 minutes.

## Directory structure

```text
index.html                  Page markup
css/styles.css              Responsive layout and theme
js/game.js                  Gameplay, pointer input, animations, and audio
js/i18n.js                  Indonesian and English interface text
assets/
  images/
    characters/             Queen, unicorn, lion
    backgrounds/            Cloud background
    ui/                     Buttons, rainbow, reward
    effects/                Sparkles
  audio/
    music/                  Background music
    sfx/                    Gameplay sound effects
docs/sources/               Asset and audio provenance notes
vercel.json                 Static hosting configuration
```

## Deploy to Vercel

The website build uses Node.js to copy only public game files to `dist/`.
No dependency installation, backend, or environment variables are required for the website.
Keep the complete directory structure below when deploying or moving the game.
All runtime paths are relative to `index.html`.

### Deploy from this folder

With Node.js installed, open a terminal in this folder and run:

```sh
npx vercel
```

Sign in, choose your account/team, create or select a project, and use `.` as
the project directory. The included `vercel.json` selects the **Other** preset,
skips dependency installation, builds the public folder, and serves `dist/`.
The command returns a preview URL.

To publish the production deployment:

```sh
npx vercel --prod
```

### Deploy from GitHub

1. Push this folder, including the image and audio files, to a repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set the Root Directory to the folder containing `index.html` and `vercel.json`.
4. Use Framework Preset **Other**, Build Command `node scripts/build-web.mjs --web-only`, an empty Install Command, and Output Directory `dist`.
5. Select **Deploy**.

Open the resulting HTTPS URL on desktop or mobile. A localhost server is not
needed after deployment. Unknown asset paths should return 404; no catch-all
HTML rewrite is needed for this game.

## Play

- Choose a duration before starting or replaying: 1, 2, or 3 minutes.
- Start with no lions; the first appears at 10 seconds, then one every 10 seconds.

- Mouse/touch: click or tap a destination inside the arena. The queen walks there;
  drag to change the destination. Movement stops on arrival.
- Keyboard: WASD or arrow keys; Esc pauses/resumes.
- Craftpix artwork now includes illustrated HUD icons, contextual cat mascots,
  illustrated WASD keys, trophy, victory confetti, and bundled kit fonts.
- Choose Clouds, Meadow, Night, or Beach in Settings; the scene is saved locally.
- Open the ☰ menu for sound, language, duration, and your best score. Opening it pauses the game.
- A movement guide appears once per page/app launch, with a saved “Don’t show again” option.
  Reopen it from About to review controls or uncheck the option to enable it again.
- About contains instructions and the creator credit. Mobile uses direct touch with no joystick.
- Language: Indonesian by default. Choose Indonesia or English in Settings;
  the preference is saved. Switching language during play pauses the game.
- Princess reacts to pickups and hits; lions react on contact with unicorns or the princess.
  Reduced-motion preferences are respected.
- Cozy play is the default: the princess has three hearts, a hit releases one collected
  unicorn, and a short immunity window prevents repeated hits. When all hearts are gone,
  touching three rescue stars restores one heart and safely continues the same game.
- Learning missions alternate between matching a letter with an illustrated object and
  counting 1–5 objects. A different letter gives a gentle hint without a penalty; two
  attempts make the target glow. Correct letters remain saved in the A–Z album.
- Gentle UI cues accompany menu opening/closing and changed settings. Each unicorn pickup plays its own overlapping sound; lion spawns have a short cue, and the final three seconds have soft ticks.
  Movement and wall bounces are silent; pause/mute cancels pending cues.
- Sound on/off controls both music and SFX. Audio starts after a user interaction.
- Best score, language, and mute preference are saved per browser/site. Localhost scores do
  not automatically transfer to the Vercel domain.

## Local preview

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Stop the server with Ctrl+C.

## Assets

Art is from the supplied Craftpix alphabet asset kit; see `docs/sources/ASSET-LICENSE.txt`.
Audio is from the supplied sound and music packs; local source notes are kept
in `docs/sources/` and excluded from Vercel CLI uploads by `.vercelignore`.

Vercel reference: https://vercel.com/docs/builds/configure-a-build

## Android app

The Capacitor Android project is in `android/`. Package ID: `id.mohryanam.omlp`.
The game, images, music, and sound effects are bundled locally for offline play.
Android Back pauses an active game; otherwise it minimizes the app. Backgrounding
also pauses the game and audio. Returning requires tapping Continue/Lanjut.

Requirements: Node.js 22+, Android Studio, JDK 21, Android SDK platform 36.
The build helper detects the standard SDK and Android Studio JDK paths on macOS;
on other systems configure `JAVA_HOME` and `ANDROID_HOME` as needed.

```sh
npm ci
npm run android:apk
```

Install `android/app/build/outputs/apk/debug/app-debug.apk` on an Android 7+
phone. Transfer the APK, open it, and allow installation from that source when
Android prompts. This debug APK is for testing, not a Play Store release.

To edit native settings or create a signed release:

```sh
npm run android:open
```

In Android Studio choose **Build > Generate Signed App Bundle / APK > Android
App Bundle**. Create and securely back up your upload keystore, use the release
variant, and enable Play App Signing in Play Console. Never commit keystores or
passwords. `npm run android:bundle` builds an **unsigned** release bundle until
release signing is configured. Increment `versionCode` in `android/app/build.gradle`
for each Play release. Confirm the package ID before the first publication.

After editing web code, run `npm run android:sync` or rebuild the APK. The Android
app contains a snapshot of the game; a Vercel deployment does not update it.
Best scores and preferences are separate from those in the browser.
