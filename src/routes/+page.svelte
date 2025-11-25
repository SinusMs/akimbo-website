<script lang="ts">
    import type { Shader } from "p5";
    import P5, { type Sketch } from "p5-svelte";

    // // ellipse size controls (Svelte 5 runes)
    // let width = $state(200);
    // let height = $state(200);

    const sketch: Sketch = (p5) => {
        let shader: Shader;

        p5.preload = () => {
            shader = p5.loadShader('noise.vert', 'noise.frag');
        };

        p5.setup = () => {
            p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL);
        };

        p5.draw = () => {
            if (shader) {
                shader.setUniform('u_time', p5.millis() / 1000.0);
                shader.setUniform('u_resolution', [p5.width, p5.height]);
                p5.shader(shader);
            }
            p5.plane(p5.width, p5.height);
        };

        p5.windowResized = () => {
            p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
        };
    };
</script>

<!-- <div class="controls">
    <label>
        Width
        <input type="range" bind:value={width} min="10" max="1000" step="0.01" />
        <span>{Math.round(width)}</span>
    </label>

    <label>
        Height
        <input type="range" bind:value={height} min="10" max="1000" step="0.01" />
        <span>{Math.round(height)}</span>
    </label>
</div> -->

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
    /* .controls {
        position: fixed;
        top: 1rem;
        left: 1rem;
        display: flex;
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
        gap: 0.5rem;
        align-items: center;
        font-size: 0.9rem;
    }

    input[type="range"] {
        width: 160px;
    } */
</style>
