# Vision research and implementation

The original 42-page Russian research review is preserved in
[Drosophila_vision_research_and_simulator_RU.pdf](Drosophila_vision_research_and_simulator_RU.pdf).
Its searchable [extracted text](drosophila-vision-research.txt) retains page markers.

The implementation follows the review's sensory prototype, especially pages 21–28:

- Measured optical axes from female specimen 20240701, 857 left / 852 right.
- Angular integration using an 8.23-degree FWHM aperture, an empirical nearly dark-adapted R1–R6 value.
- Relative linear RGB capture, temporal filtering, background adaptation and log contrast.
- Signed delayed correlation between spherical neighbours and separate ON/OFF branches.
- A fixed pale/yellow mosaic with available blue/green R8 proxies.
- An independent human-readable visualization of brightness, colour and motion.

## Boundaries of the model

This is an engineering prototype, not validated fly physiology or reconstructed subjective experience. RGB photographs do not supply UV, polarization or calibrated photon flux. Those channels remain unavailable. Retinal movements and individual facet origins are not reconstructed; outer capture is pooled rather than a six-cell neural-superposition model.

Room dimensions, hidden surfaces, vessels and landing heights are authored approximations. Ray depth selects occlusion but is not supplied to the behavioural controller. The main camera retains the photograph; eye capture uses the approximate closed room.

`visual-circuit.js` exports the parameter registry with units, sources and empirical/engineering status. `eye-map.json` retains the source URL and hash. The source eye-map GPL license is preserved in `eye-data-license.txt`.

## Validation

Run the `verify_vision.js`, `verify_eye_display.js`, `verify_visual_circuit.js` and `verify_async_vision.js` scripts with Node.js. They cover room-ray coverage, occlusion, pose changes, display continuity, static/flash rejection, directional motion, reverse-phi correlation, adaptation, numerical convergence and worker scheduling.

The neural solver uses substeps up to 1 ms. A background worker computes capture and eye images; under load it coalesces intermediate poses while preserving elapsed integration time. The render cadence is a software property, not the fly's biological temporal resolution.

## Primary references

- [Zhao et al., Nature (2025)](https://doi.org/10.1038/s41586-025-09276-5)
- [Measured eye-map data](https://github.com/reiserlab/eyemap_T4)
- [Gonzalez-Bellido et al., PNAS (2011)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3054003/)
- [Sharkey et al. (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7588446/)
