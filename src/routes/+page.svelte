<script lang="ts">
    import type { Shader } from "p5";
    import P5, { type Sketch } from "p5-svelte";

    const MILIS_TO_SECONDS = 0.001;

    let scale = $state(3.0);
    let speed = $state(0.01);

    // UI-controlled uniforms
    let color1 = $state('#ffffff');
    let color2 = $state('#000000');
    let sectionCount = $state(6);

    function hexToRgbNormalized(hex: string) {
        const h = hex.replace('#', '');
        const bigint = parseInt(h, 16);
        const r = ((bigint >> 16) & 255) / 255;
        const g = ((bigint >> 8) & 255) / 255;
        const b = (bigint & 255) / 255;
        return [r, g, b];
    }

    const sketch: Sketch = (p5) => {
        let noise: Shader;

        p5.preload = () => {
            noise = p5.loadShader('noise.vert', 'noise.frag');
        };

        p5.setup = () => {
            p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL);
        };

        p5.draw = () => {
            if (noise) {
                noise.setUniform('uTime', p5.millis() * MILIS_TO_SECONDS * speed);
                noise.setUniform('uResolution', [p5.width, p5.height]);
                noise.setUniform('uScale', scale);
                noise.setUniform('uColor1', hexToRgbNormalized(color1));
                noise.setUniform('uColor2', hexToRgbNormalized(color2));
                noise.setUniform('uSectionCount', sectionCount);
                // 0.0 => automatic edge width (shader computes approx). Set >0 to override.
                noise.setUniform('uEdgeSmoothing', 20);

                p5.shader(noise);
            }
            p5.noStroke();
            p5.plane(p5.width, p5.height);
        };

        p5.windowResized = () => {
            p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
        };
    };
</script>

<div class="controls">
    <label>
        Scale
        <input type="range" bind:value={scale} min="1" max="10" step="0.1" />
        <span>{scale.toFixed(1)}</span>
    </label>
    <label>
        Speed
        <input type="range" bind:value={speed} min="0.001" max="0.1" step="0.001" />
        <span>{speed.toFixed(3)}</span>
    </label>
    <label>
        Color 1
        <input type="color" bind:value={color1} />
    </label>
    <label>
        Color 2
        <input type="color" bind:value={color2} />
    </label>
    <label>
        Sections
        <input type="range" bind:value={sectionCount} min="2" max="10" step="2" />
        <span>{sectionCount}</span>
    </label>
</div>

<div class="sketch">
    <P5 {sketch} />
</div>

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
    }

    /* make the P5 container cover the full viewport */
    .sketch {
        position: fixed;
        inset: 0;
        z-index: 0;
    }

    /* overlay controls */
    .controls {
        position: fixed;
        top: 1rem;
        left: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        background: rgba(255, 255, 255, 0.9);
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        z-index: 20;
        align-items: center;
        box-shadow: 0 6px 18px rgba(0,0,0,0.12);
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-start;
        font-size: 0.9rem;
    }

    input[type="range"] {
        width: 160px;
    }
</style>
