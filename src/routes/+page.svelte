<script lang="ts">
    import type { Shader } from "p5";
    import P5, { type Sketch } from "p5-svelte";

    const MILIS_TO_SECONDS = 0.001;

    let showControls = $state(false);
    
    let scale = $state(3.0);
    let speed = $state(0.01);
    let color1 = $state('#588157');
    let color2 = $state('#9EB18B');
    let sectionCount = $state(6);
    let edgeSmoothing = $state(20);
    let cornerRadius: number = $state(0.04);
    let maxDiameterHorizontal = $state(0.75);
    let maxDiameterVertical = $state(0.9);
    let rotation: number = $state(1.35);
    let nameFontScale = $state(0.63);
    let nameVerticalOffset = $state(-0.21);
    let subtitleFontScale = $state(0.18);
    let subtitleVerticalOffset = $state(0.17);
    let normalizedTriangleCenterX: number = $state(0.47);
    let normalizedTriangleCenterY: number = $state(0.47);

    let triangleRadius = $state(0);
    let triangleCenterX: number, triangleCenterY: number;
    let trianglePoints: { x: number; y: number }[];

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

        function updateTrianglePoints() {
            const w = p5.width * maxDiameterHorizontal;
            const h = p5.height * maxDiameterVertical;
            triangleRadius = Math.min(w, h) / 2;
            trianglePoints = [];
            triangleCenterX = p5.lerp(-p5.width / 2, p5.width / 2, normalizedTriangleCenterX);
            triangleCenterY = p5.lerp(-p5.width / 2, p5.width / 2, normalizedTriangleCenterY);
            for (var i = 0; i < 3; i++) {
                var x = triangleCenterX + triangleRadius * Math.cos(i * Math.PI * 2 / 3.0 - Math.PI / 2);
                var y = triangleCenterY + triangleRadius * Math.sin(i * Math.PI * 2 / 3.0 - Math.PI / 2);
                trianglePoints[i] = { x, y };
            }
        }

        p5.preload = () => {
            noise = p5.loadShader('noise.vert', window.devicePixelRatio <= 2 ? 'noise.frag' : 'noise_noAA.frag');
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
            var rad = cornerRadius * triangleRadius;

            p5.translate(triangleCenterX, triangleCenterY);
            p5.rotate(rotation);

            p5.beginShape();
            for (var i = 0; i < 3; i++) {
                var px = p5.map(cornerRadius, 0, 1, trianglePoints[i].x - triangleCenterX, 0);
                var py = p5.map(cornerRadius, 0, 1, trianglePoints[i].y - triangleCenterY, 0);

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
    Debug Controls
</button>

{#if showControls}
<div class="controls">
    <span>DPR: {window.devicePixelRatio}</span>
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
    <label>
        Name Font Scale
        <input type="range" bind:value={nameFontScale} min="0" max="1" step="0.01" />
        <span>{nameFontScale}</span>
    </label>
    <label>
        Name Vertical Position
        <input type="range" bind:value={nameVerticalOffset} min="-1" max="1" step="0.01" />
        <span>{nameVerticalOffset}</span>
    </label>
    <label>
        Subtitle Font Scale
        <input type="range" bind:value={subtitleFontScale} min="0" max="1" step="0.01" />
        <span>{subtitleFontScale}</span>
    </label>
    <label>
        Subtitle Vertical Position
        <input type="range" bind:value={subtitleVerticalOffset} min="-1" max="1" step="0.01" />
        <span>{subtitleVerticalOffset}</span>
    </label>
    <label>
        Triangle Center X
        <input type="range" bind:value={normalizedTriangleCenterX} min="0" max="1" step="0.01" />
        <span>{normalizedTriangleCenterX}</span>
    </label>
    <label>
        Triangle Center Y
        <input type="range" bind:value={normalizedTriangleCenterY} min="0" max="1" step="0.01" />
        <span>{normalizedTriangleCenterY}</span>
    </label>
</div>
{/if}

<span class="logo-name" style="font-size: {triangleRadius * nameFontScale}px; transform: translate(-50%, calc(-50% + {triangleRadius * nameVerticalOffset}px))">
    Akimbo
</span>

<span class="logo-subtitle" style="font-size: {triangleRadius * subtitleFontScale}px; transform: translate(-50%, calc(-50% + {triangleRadius * subtitleVerticalOffset}px))">
    CREATIVE ENGINEERING
</span>

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
        width: 260px;
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

    .logo-name {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 10; 
        pointer-events: none;
        font-family: 'Gantari';
        font-weight: 800;
        color: #0E1511;
    }

    .logo-subtitle {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 10; 
        pointer-events: none;
        font-family: 'Gantari';
        font-weight: 340;
        color: #0E1511;
        text-wrap: nowrap;
        letter-spacing: 0.4px;
        word-spacing: 1px;
    }
</style>
