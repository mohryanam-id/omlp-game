# One More Little Pony

A static browser game: guide the queen, collect unicorns, avoid lions, and survive 60 seconds.

## Directory structure

```text
index.html                  Page markup
css/styles.css              Responsive layout and theme
js/game.js                  Gameplay, touch input, animations, and audio
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

No dependencies, build step, backend, or environment variables are required.
Keep the complete directory structure below when deploying or moving the game.
All runtime paths are relative to `index.html`.

### Deploy from this folder

With Node.js installed, open a terminal in this folder and run:

```sh
npx vercel
```

Sign in, choose your account/team, create or select a project, and use `.` as
the project directory. The included `vercel.json` selects the **Other** preset,
skips installation and building, and serves this folder directly.
The command returns a preview URL.

To publish the production deployment:

```sh
npx vercel --prod
```

### Deploy from GitHub

1. Push this folder, including the image and audio files, to a repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set the Root Directory to the folder containing `index.html` and `vercel.json`.
4. Use Framework Preset **Other**, no Build or Install command, and Output Directory `.`.
5. Select **Deploy**.

Open the resulting HTTPS URL on desktop or mobile. A localhost server is not
needed after deployment. Unknown asset paths should return 404; no catch-all
HTML rewrite is needed for this game.

## Play

- Desktop: WASD or arrow keys; Esc pauses/resumes.
- Mobile: drag the joystick, release to stop, and use Pause/Resume.
- Sound on/off controls both music and SFX. Audio starts after a user interaction.
- Best score and mute preference are saved per browser/site. Localhost scores do
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
