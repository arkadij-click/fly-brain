# Fly Brain: a fly in your kitchen

[Play the simulator](https://arkadij.click/fly-brain)

A browser game with an autonomous fruit fly in a photographed kitchen. Place food, change light and wind, follow the fly, or switch to its approximate compound-eye view. Connectome-informed activity is shown alongside the fly.

The app is static HTML, JavaScript and media. No build step, backend, accounts or external API keys are required. Vision capture and neural processing run in a Web Worker to keep the controls responsive.

## Play

- Choose a food and click a counter, table or window ledge. One click places it and restores the normal cursor; Escape cancels placement.
- **Follow** toggles the following camera; **Fly view** or **V** switches to full-screen eye views with a position map.
- **Shoo** or **S** startles the fly. **Space** pauses. Room and Sound open environment and audio controls.
- Music and sound use Web Audio and require a user click to start.

## Run locally

Serve the repository over HTTP, rather than opening `index.html` directly:

```sh
python -m http.server 8766 --bind 127.0.0.1
```

Open http://127.0.0.1:8766/. Windows users can also run `launch.ps1`.

## Research and model

The [research folder](research/README.md) preserves the original 42-page Russian vision review, its extracted text, sources, model assumptions and validation notes. [Implementation details](docs/implementation.md) describe the connectome, authored behaviour, approximate room, sensory pipeline and sound.

The source animal is an adult female *Drosophila melanogaster*. Real FAFB v783 wiring and measured eye axes inform simplified models. Behaviour, room geometry and parameter choices are engineering approximations. This is not a reconstruction of a living fly or its subjective experience; UV and polarization cannot be recovered from the RGB photos.

The included `brain.json` runs without the full connectome. Rebuilding it with `build_brain.py` requires NumPy, SciPy and the FAFB v783 source tables at the data path specified in that script. The large source graph is not included.

## Test

With Node.js 22 or newer:

```sh
npm test
```

No npm dependencies are needed. CI runs the behavioural, camera, daylight, food, room, vision and worker tests.

## Hosting

GitHub Pages serves the repository root from the `main` branch. All assets and worker imports use relative paths so the `/fly-brain/` project URL works.

## Licensing and attribution

Code is licensed under GPL-3.0; see [LICENSE](LICENSE). The measured eye-map source and its license are retained in `eye-map.json` and `eye-data-license.txt`. [NOTICE](NOTICE.md) records provenance. Photographs and the supplied research document are project materials with their own rights; the code license does not grant a separate license to those materials.

Only the exterior window crop used by the renderer is published; the unused full daylight source photograph remains local.
