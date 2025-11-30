<script lang="ts">
    import type { Shader } from "p5";
    import P5, { type Sketch } from "p5-svelte";

    const MILIS_TO_SECONDS = 0.001;

    let showControls = $state(true);
    
    let scale = $state(3.0);
    let speed = $state(0.01);
    let color1 = $state('#588157');
    let color2 = $state('#9EB18B');
    let sectionCount = $state(6);
    let edgeSmoothing = $state(20);

    let maxDiameterHorizontal = $state(0.9);
    let maxDiameterVertical = $state(0.9);
    let triangleRadius: number;
    let rotation: number = $state(1.35);
    let cx: number, cy: number;
    let trianglePoints: { x: number; y: number }[];
    let cornerRadius: number = $state(0.04);

    function hexToRgbNormalized(hex: string) {
        const h = hex.replace('#', '');
        const bigint = parseInt(h, 16);
        const r = ((bigint >> 16) & 255) / 255;
        const g = ((bigint >> 8) & 255) / 255;
        const b = (bigint & 255) / 255;
        return [r, g, b];
    }

    function updateTrianglePoints() {
        triangleRadius = Math.min(window.innerWidth * maxDiameterHorizontal, window.innerHeight * maxDiameterVertical) / 2;
        cx = 0;
        cy = 0;
        trianglePoints = [];
        for (var i = 0; i < 3; i++) {
            var x = cx + triangleRadius * Math.cos(i * Math.PI * 2 / 3.0 - Math.PI / 2);
            var y = cy + triangleRadius * Math.sin(i * Math.PI * 2 / 3.0 - Math.PI / 2);
            trianglePoints[i] = { x, y };
        }
    }

    const sketch: Sketch = (p5) => {
        let noise: Shader;

        p5.preload = () => {
            noise = p5.loadShader('noise.vert', 'noise.frag');
        };

        p5.setup = () => {
            p5.setAttributes({ antialias: true });
            p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL);
            p5.angleMode(p5.RADIANS);
            updateTrianglePoints();
        };

        p5.draw = () => {
            p5.clear();
            // updateTrianglePoints();
            if (noise) {
                noise.setUniform('uTime', p5.millis() * MILIS_TO_SECONDS * speed);
                noise.setUniform('uResolution', [p5.width, p5.height]);
                noise.setUniform('uScale', scale);
                noise.setUniform('uColor1', hexToRgbNormalized(color1));
                noise.setUniform('uColor2', hexToRgbNormalized(color2));
                noise.setUniform('uSectionCount', sectionCount);
                noise.setUniform('uEdgeSmoothing', edgeSmoothing);

                p5.shader(noise);
            }
            p5.noStroke();
            p5.rotate(rotation)
            var rad = cornerRadius * triangleRadius;

            p5.beginShape();
            for (var i = 0; i < 3; i++) {
                var px = p5.map(cornerRadius, 0, 1, trianglePoints[i].x, cx);
                var py = p5.map(cornerRadius, 0, 1, trianglePoints[i].y, cy);

                var ang1 = (i + 1) * p5.TWO_PI / 3.0 + p5.HALF_PI;
                var ang2 = (i + 2) * p5.TWO_PI / 3.0 + p5.HALF_PI;
                var dang = (ang2 - ang1) / 60.0;
                for (var t = ang1; t <= ang2; t += dang) {
                    var ax = px + rad * p5.cos(t);
                    var ay = py + rad * p5.sin(t);
                    p5.vertex(ax, ay);
                }
            }
            p5.endShape(p5.CLOSE);
        };

        p5.windowResized = () => {
            p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
            updateTrianglePoints();
        };
    };
</script>

<button class="controls-toggle" onclick={() => showControls = !showControls} aria-label="Toggle controls">
    {showControls ? 'Hide' : 'Show'}
</button>

{#if showControls}
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
    <label>
        Edge Smoothing
        <input type="range" bind:value={edgeSmoothing} min="0" max="60" step="2" />
        <span>{edgeSmoothing}</span>
    </label>
    <label>
        Corner Radius
        <input type="range" bind:value={cornerRadius} min="0" max="1" step="0.01" />
        <span>{cornerRadius}</span>
    </label>
    <label>
        Diameter Horizontal
        <input type="range" bind:value={maxDiameterHorizontal} min="0" max="1" step="0.01" />
        <span>{maxDiameterHorizontal}</span>
    </label>
    <label>
        Diameter Vertical
        <input type="range" bind:value={maxDiameterVertical} min="0" max="1" step="0.01" />
        <span>{maxDiameterVertical}</span>
    </label>
    <label>
        Rotation
        <input type="range" bind:value={rotation} min="0" max="3.1415" step="0.01" />
        <span>{rotation}</span>
    </label>
</div>
{/if}

<div class="sketch">
    <P5 {sketch} />
</div>

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
        background-color: #D9DACD;
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

    /* small toggle button in the top-right corner */
    .controls-toggle {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 30;
        background: rgba(0,0,0,0.6);
        color: white;
        border: none;
        padding: 0.4rem 0.6rem;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }

    .controls-toggle:active {
        transform: translateY(1px);
    }
</style>
