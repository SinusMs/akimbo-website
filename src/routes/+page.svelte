<script lang="ts">
    import type { Shader } from "p5";
    import P5, { type Sketch } from "p5-svelte";
    import { gsap } from "gsap";
    import { ScrollTrigger } from "gsap/ScrollTrigger";
    import { SplitText } from "gsap/SplitText";
    import { onMount, onDestroy } from 'svelte';
    gsap.registerPlugin(ScrollTrigger, SplitText);

    const MILIS_TO_SECONDS = 0.001;
    const dpr = (typeof window !== 'undefined') ? (window.devicePixelRatio || 1) : 1;

    let showControls = $state(false);
    let fps = $state(0);
    
    let scale = $state(3.0);
    let speed = $state(0.04);
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
    let sketchScale: number = 1;
    let sketchScaleTarget: number = 3.5;
    let scroller: HTMLElement | null = null;
    let scrollTl: any = null;

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

        function updateTrianglePoints(forceRadius?: number) {
            if (forceRadius == undefined) {
                const w = p5.width * maxDiameterHorizontal;
                const h = p5.height * maxDiameterVertical;
                triangleRadius = Math.min(w, h) / 2;
            }
            else {
                triangleRadius = forceRadius;
            }
            trianglePoints = [];
            triangleCenterX = p5.lerp(-p5.width / 2, p5.width / 2, normalizedTriangleCenterX);
            triangleCenterY = p5.lerp(-p5.width / 2, p5.width / 2, normalizedTriangleCenterY);
            for (var i = 0; i < 3; i++) {
                var x = triangleCenterX + triangleRadius * Math.cos(i * Math.PI * 2 / 3.0 - Math.PI / 2);
                var y = triangleCenterY + triangleRadius * Math.sin(i * Math.PI * 2 / 3.0 - Math.PI / 2);
                trianglePoints[i] = { x, y };
            }
        }

        function setupAnimations() {
            const targetTriangleRadius = triangleRadius;
            triangleRadius = 0;
            updateTrianglePoints(0);
            const obj: any = { r: 0 };
            gsap.to(obj, {
                delay: 0.5,
                r: targetTriangleRadius,
                duration: 2,
                ease: 'back.out',
                onUpdate: () => {
                    updateTrianglePoints(obj.r);
                }
            });
            
            let splitName: SplitText = SplitText.create("#logo-name", {
                type: "words",
                mask: "words"
            });
            gsap.from(splitName.words, {
                yPercent: 100,
                duration: 1.5,
                ease: "expo.out",
                delay: 2,
                stagger: 0.05,
            });

            let splitSubtitle: SplitText = SplitText.create("#logo-subtitle", {
                type: "words",
                mask: "words"
            });
            gsap.from(splitSubtitle.words, {
                yPercent: -100,
                duration: 1.2,
                ease: "expo.out",
                delay: 2.3,
                stagger: 0.05,
            });
        }

        p5.preload = () => {
            noise = p5.loadShader('noise.vert', dpr >= 2 ? 'noise_noAA.frag' : 'noise.frag');
        };

        p5.setup = () => {
            p5.setAttributes({ antialias: true });
            p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL);
            p5.angleMode(p5.RADIANS);
            updateTrianglePoints();
            setupAnimations();
            setInterval(() => {
                fps = p5.frameRate();
            }, 50);
        };

        p5.draw = () => {
            p5.clear();
            // updateTrianglePoints();
            if (noise) {
                noise.setUniform('uTime', p5.millis() * MILIS_TO_SECONDS * speed);
                noise.setUniform('uResolution', [p5.width, p5.height]);
                noise.setUniform('uScale', scale / dpr);
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
            p5.scale(sketchScale);

            p5.beginShape();
            for (var i = 0; i < 3; i++) {
                var px = p5.map(cornerRadius, 0, 1, trianglePoints[i].x - triangleCenterX, 0);
                var py = p5.map(cornerRadius, 0, 1, trianglePoints[i].y - triangleCenterY, 0);

                var ang1 = (i + 1) * p5.TWO_PI / 3.0 + p5.HALF_PI;
                var ang2 = (i + 2) * p5.TWO_PI / 3.0 + p5.HALF_PI;
                var dang = (ang2 - ang1) / 20.0;
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
    onMount(() => {
        const a = document.getElementById('contact-mail');
        const attr = a?.getAttribute('href');
        if (a != null && attr != null){
            a.setAttribute('href', attr
                .replace('-', 'o@')
                .replaceAll('-', 'ki')
                .replace('contact', 'a')
                .replace('/', 'o.dev')
                .replace('to', 'mailto:hell')
                .replace('adress', 'mb')
            );
        }

        const splitName = SplitText.create("#logo-name", { type: "words", mask: "words" });
        const splitSubtitle = SplitText.create("#logo-subtitle", { type: "words", mask: "words" });

        scrollTl = gsap.timeline({
            scrollTrigger: {
                scroller: scroller,
                trigger: "#about",
                start: "top bottom",
                end: "top 60%",
                scrub: 1,
            },
        });

        scrollTl.addLabel("start");
        scrollTl.to("#logo-name", {
            xPercent: -200,
            ease: "power4.in",
        }, "start");
        scrollTl.to("#logo-subtitle", {
            xPercent: 200,
            ease: "power4.in",
        }, "start");

        const triangleZoomParams: any = { s: sketchScale, c: cornerRadius };
        scrollTl.to(triangleZoomParams, {
            s: sketchScaleTarget,
            ease: "power4.in",
            onUpdate() {
                sketchScale = triangleZoomParams.s;
            },
            onComplete() {
                sketchScale = 10;
            }
        }, "start");
        scrollTl.to(triangleZoomParams, {
            c: 1,
            ease: "power1.in",
            onUpdate() {
                cornerRadius = triangleZoomParams.c;
            }
        }, "start");

        ScrollTrigger.refresh();
    });

    onDestroy(() => {
        if (scrollTl) scrollTl.kill();
        ScrollTrigger.getAll().forEach(t => t.kill());
    });
</script>

<button class="controls-toggle" onclick={() => showControls = !showControls} aria-label="Toggle controls">
    Debug Controls
</button>

<span style="position: fixed; z-index: 100;">FPS: {fps.toFixed(0)}</span>
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

<!-- element displayed as loading Screen for P5 sketches -->
<div id="p5_loading"></div>

<div bind:this={scroller} class="scroller">
    <div class="size-full">
        <span id="logo-name" class="logo-name" style="font-size: {triangleRadius * nameFontScale}px; transform: translate(-50%, calc(-50% + {triangleRadius * nameVerticalOffset}px))">
            Akimbo
        </span>

        <span id="logo-subtitle" class="logo-subtitle" style="font-size: {triangleRadius * subtitleFontScale}px; transform: translate(-50%, calc(-50% + {triangleRadius * subtitleVerticalOffset}px))">
            CREATIVE ENGINEERING
        </span>
    </div>

    <div class="sketch">
        <P5 {sketch} />
    </div>
    <div class="w-full flex flex-col items-center justify-center font-[Gantari] text-red-450">
        <div class="flex flex-row items-center place-content-center gap-10 m-10 max-sm:m-5 max-w-7xl">
            <img src="/marc.jpg" alt="Marc" class="rounded-xl w-full hidden lg:inline basis-2/5 shadow-2xl/50">
            <div id="about" class="bg-red-50 relative w-full rounded-xl px-10 py-8 lg:basis-3/5 shadow-2xl/50">
                <div class="flex flex-col place-content-center justify-center h-full gap-8">
                    <h1 class="text-2xl sm:text-3xl font-bold">
                        Webentwicklung und Software Engineering.<br>
                        Mit Leidenschaft.<br>
                        Aus Dresden.
                        <div class="bg-red-200 h-2 w-20 rounded-sm mt-4"></div>
                    </h1>
                    <img src="/marc.jpg" alt="Marc" class="rounded-xl w-full max-w-150 lg:hidden self-center">
                    <div class="text-md md:text-2xl">
                        Hi! Ich bin Marc, Gründer von Akimbo Creative Engineering. 
                        Angetrieben von meiner Faszination am Zusammenspiel von Gestaltung und Technologie 
                        übernehme ich als Full Stack Entwickler alle Verantwortlichkeiten im Entwicklungsprozess selbst, 
                        von Design über Front- und Backendprogrammierung bis Hosting und Maintenance.
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-row items-center place-content-center gap-10 m-10 max-sm:m-5 max-w-7xl bg-red-50 rounded-xl px-10 py-8 shadow-2xl/50">
            <div class="flex flex-col place-content-center justify-center h-full gap-6">
                <h1 class="text-2xl sm:text-3xl font-bold">
                    Technologien
                    <div class="bg-red-200 h-2 w-20 rounded-sm mt-4"></div>
                </h1>
                <div class="text-md md:text-2xl">
                    Mit Erfahrung in diversen Sprachen, Librarys und Frameworks finde ich den idealen Tech-stack für dein Projekt. 
                    Neben den hier aufgeführten Frameworks und Librarys setze ich bei Bedarf auch weitere Technologien ein, um optimale Ergebnisse zu erzielen.
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mt-4 lg:text-center">
                    Backend
                </h2>
                <div class="w-full flex flex-col sm:flex-row place-content-evenly items-center gap-8 md:gap-12 px-6">
                    <a href="https://rubyonrails.org" class="w-full max-w-70 flex flex-col justify-center"><img src="/logos/rails.svg" alt="Ruby on Rails"></a>
                    <a href="https://laravel.com" class="w-full max-w-70 flex flex-col justify-center"><img src="/logos/laravel.svg" alt="Laravel"></a>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mt-6 lg:text-center">
                    Frontend
                </h2>
                <div class="w-full flex flex-row flex-wrap place-content-evenly items-center gap-12 px-6">
                    <a href="https://svelte.dev" class="h-15 sm:h-20 flex justify-center"><img src="/logos/svelte.svg" alt="Svelte" class="max-h-[120px]"></a>
                    <a href="https://svelte.dev" class="h-15 sm:h-20 flex justify-center"><img src="/logos/bootstrap.svg" alt="Bootstrap" class="max-h-[120px]"></a>
                    <a href="https://svelte.dev" class="h-10 sm:h-20 flex justify-center"><img src="/logos/tailwind.svg" alt="Tailwind" class="max-h-[120px]"></a>
                    <a href="https://svelte.dev" class="h-15 sm:h-20 flex justify-center"><img src="/logos/p5.png" alt="p5.js" class="max-h-[120px]"></a>
                    <a href="https://svelte.dev" class="h-15 sm:h-20 flex justify-center"><img src="/logos/gsap.svg" alt="GSAP" class="max-h-[120px] bg-[#313131] p-3 rounded-lg"></a>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mt-6 lg:text-center">
                    Game Engines
                </h2>
                <div class="w-full flex flex-col sm:flex-row place-content-evenly items-center gap-12 px-6">
                    <a href="https://rubyonrails.org" class="w-full max-w-70 flex flex-col justify-center"><img src="/logos/godot.svg" alt="Godot"></a>
                    <a href="https://laravel.com" class="w-full max-w-70 flex flex-col justify-center"><img src="/logos/unity.png" alt="Unity"></a>
                </div>
            </div>
        </div>

        <div class="flex flex-row items-center place-content-center gap-10 m-10 max-sm:m-5 max-w-7xl bg-red-50 rounded-xl px-10 py-8 shadow-2xl/50">
            <div class="flex flex-col place-content-center justify-center h-full gap-6">
                <h1 class="text-2xl sm:text-3xl font-bold">
                    Kontakt
                    <div class="bg-red-200 h-2 w-20 rounded-sm mt-4"></div>
                </h1>
                <a id="contact-mail" rel="nofollow, noindex" href="to-contact-adress/">
                    <div class="email text-2xl font-semibold text-red-300">
                        hel<!--shitfuck-->lo@<span>&#97;k</span>imbo.<span>contact-sales.</span>dev
                    </div>
                </a>
                <div class="text-md md:text-2xl">
                    Lass uns gemeinsam etwas großartiges erschaffen!
                </div>
            </div>
        </div>
    </div>

</div>

<style>
    :global(html, body) {
        height: 100%;
        margin: 0;
        background-color: #D9DACD;
    }

    :global(html) {
        overflow: hidden;
        width: 100%;
    }
    :global(body) {
        height: 100%;
        width: 100%;
        position: fixed;
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
    }

    /* make the P5 container cover the full viewport */
    .sketch {
        position: fixed;
        inset: 0;
        z-index: -10;
        pointer-events: none;
    }

    /* inner scroller used on mobile when body is fixed */
    .scroller {
        position: absolute;
        inset: 0;
        height: 100vh;
        width: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
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
        line-height: 80%;
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
        line-height: 80%;
    }

    div.email > span:nth-child(2) {
        display: none;
    }
</style>
