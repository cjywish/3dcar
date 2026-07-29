# Neon Ridge Racer

A small arcade-style 3D racing game built with Three.js and Vite, with a Streamlit wrapper for deployment.

## Local development

Run the game directly:

```powershell
npm install
npm run dev
```

Build the frontend for Streamlit:

```powershell
npm run build
```

Run the Streamlit wrapper:

```powershell
streamlit run streamlit_app.py
```

## Controls

- `WASD` or arrow keys to steer and change speed
- `R` or the restart button to reset after a crash
- `Start Game` to begin the race
- `BGM On / BGM Off` to toggle music

## Streamlit Cloud deployment

1. Make sure `dist/` exists by running `npm run build`.
2. Commit `streamlit_app.py`, `requirements.txt`, and the built `dist/` folder.
3. Push the repository to GitHub.
4. In Streamlit Community Cloud, create a new app and select `streamlit_app.py` as the entry point.

## Notes

- The Streamlit app inlines the built HTML, CSS, and JS from `dist/index.html`.
- If `dist/` is missing, the Streamlit wrapper will show a build reminder.
