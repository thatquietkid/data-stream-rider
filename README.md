# Data-Stream Rider: A 3D Gamified Resume

**Data-Stream Rider** is an interactive 3D resume built with Three.js. It re-imagines a professional resume as an on-rails arcade game set in a retro-futuristic, neon-drenched data tunnel.

The player flies through a "data-stream," collecting skill tokens (like Go and Angular) and avoiding bugs, all while progressing through levels that correspond to a traditional resume's "Experience" and "Projects" sections. The game culminates in a "Star Wars"-style credits roll displaying the full resume.

---

## 🚀 Features

- **3D On-Rails Gameplay:** Automatic forward momentum with player control for strafing (WASD/Arrow Keys).
- **Arcade Theme:** A retro 80s neon aesthetic, complete with glow effects (Unreal Bloom), a wireframe tunnel, and a classic "Press Start 2P" font.
- **Dynamic UI:** All menus (Start, Pause, Modals) are built in HTML/CSS and overlaid on the 3D scene.
- **Score & Progress:** A classic arcade score increases with skill tokens and decreases with bugs. A progress bar tracks the player's journey.
- **Leveling System:** Hitting "level" gates with a high enough score increases the player's speed and plays a level-up sound.
- **Gamified Resume:**
  - **Level 1: Experience:** A modal pops up detailing professional experience.
  - **Level 2: Projects:** A second modal appears showcasing personal projects.
  - **Final Credits:** The game ends with a Star Wars-style 3D credits crawl of the full resume.
- **Audio Feedback:** Features audio for token collection, hitting obstacles, leveling up, and a final credits soundtrack.

---

## 🧠 Technology Stack

- **3D Graphics:** [Three.js](https://threejs.org/)
- **Build Tool & Dev Server:** [Vite](https://vitejs.dev/)
- **Core Language:** JavaScript (ES6+)
- **UI:** HTML5 & CSS3
- **Post-Processing:** `EffectComposer` and `UnrealBloomPass` for the "glow" effect.

---

## ⚙️ How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thatquietkid/data-stream-rider.git
```

2. **Navigate to the project directory:**

   ```bash
   cd data-stream-rider
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173/` (or the address shown in your terminal).

---

## 🗂️ Project Structure

```
/data-stream-rider
├── /public/              # All static assets (models, audio, textures)
│   ├── /audio/           # Sound effects and music
│   │   ├── collect.wav
│   │   ├── endcredits.wav
│   │   ├── game.wav
│   │   ├── hit.wav
│   │   └── levelup.wav
│   └── /models/          # 3D models in GLB format
│       ├── angular.glb
│       ├── bug.glb
│       └── golang.glb
├── /src/                 # All source code
│   ├── main.js           # Main game logic
│   ├── spline.js         # The CatmullRomCurve3 path data
│   └── style.css         # All UI and overlay styles
├── index.html            # The main HTML entry point
├── package.json
└── README.md
```

---

## 🎨 Credits

* **3D Models:** Created using [Krea AI](krea.ai/3d)
* **Fonts:** ["Press Start 2P"](https://fonts.google.com/specimen/Press+Start+2P) by Google Fonts.
* **Audio:** Sourced from [Mixkit](https://mixkit.co/free-sound-effects/), [Pixabay](https://pixabay.com/sound-effects/)

---

>  *Data-Stream Rider* redefines the resume as an experience — where your skills aren’t just read, they’re played.