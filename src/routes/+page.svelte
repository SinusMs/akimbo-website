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

    let fps = $state(0);
    
    let scale = 3.0;
    let speed = 0.04;
    let color1 = '#588157';
    let color2 = '#9EB18B';
    let sectionCount = 6;
    let edgeSmoothing = 24;
    let cornerRadius: number = 0.04;
    let maxDiameterHorizontal = 0.75;
    let maxDiameterVertical = 0.9;
    let rotation: number = 1.35;
    let nameFontScale = 0.63;
    let nameVerticalOffset = -0.21;
    let subtitleFontScale = 0.18;
    let subtitleVerticalOffset = 0.17;
    let normalizedTriangleCenterX: number = 0.47;
    let normalizedTriangleCenterY: number = 0.47;

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
            let timeline = gsap.timeline();
            
            const obj: any = { r: 0 };
            timeline.to(obj, {
                r: targetTriangleRadius,
                duration: 1,
                ease: 'power2.out',
                onUpdate: () => {
                    updateTrianglePoints(obj.r);
                }
            }, 0.5);
            timeline.addLabel("endTriangleGrow");
            
            let splitName: SplitText = SplitText.create("#logo-name", {
                type: "words",
                mask: "words"
            });
            timeline.from(splitName.words, {
                yPercent: 100,
                duration: 0.7,
                ease: "power2.out",
                stagger: 0.05,
            }, "endTriangleGrow-=0.5");
            
            let splitSubtitle: SplitText = SplitText.create("#logo-subtitle", {
                type: "words",
                mask: "words"
            });
            timeline.from(splitSubtitle.words, {
                yPercent: -100,
                duration: 0.5,
                ease: "power2.out",
                stagger: 0.1,
            }, "endTriangleGrow-=0.2");
            timeline.set(".scroller", { overflowY: "auto" });
            gsap.set("#scroll-instruction", { opacity: 1 });
            
            timeline.from("#scroll-instruction", {
                yPercent: 110,
                duration: 0.3,
                ease: "back.out",
            }, "+=5");
            timeline.to("#scroll-instruction", {
                yPercent: 110,
                duration: 0.3,
                ease: "back.in",
            }, "+=10");
        }

        p5.preload = () => {
            noise = p5.loadShader('noise.vert', dpr >= 2 ? 'noise_noAA.frag' : 'noise.frag');
        };

        p5.setup = () => {
            p5.setAttributes({ antialias: dpr < 2 });
            p5.pixelDensity(p5.min(dpr, 2));
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

<span style="position: fixed; z-index: 100;">
    FPS: {fps.toFixed(0)}<br>
    DPR: {window.devicePixelRatio}
</span>

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
        <span id="scroll-instruction" class="fixed w-full text-center font-[Gantari] bottom-0 mb-2 opacity-0 -z-20 text-xl">Scrolle, um mehr zu sehen!</span>
    </div>

    <div class="sketch">
        <P5 {sketch} />
    </div>
    <div class="w-full flex flex-col gap-10 mb-20 items-center justify-center font-[Gantari] text-red-450 z-50">
        <div class="flex flex-row items-end gap-10 mx-10 max-sm:mx-5 max-w-7xl">
            <img id="about-image" src="marc.jpg" alt="Marc" class="rounded-xl w-25 hidden lg:inline basis-2/5 shadow-2xl/50">
            <div id="about" class="bg-red-50 relative w-full rounded-xl px-10 py-8 lg:basis-3/5 shadow-2xl/50">
                <div class="flex flex-col place-content-center justify-center h-full gap-8">
                    <h1 class="text-2xl sm:text-3xl font-bold">
                        Webentwicklung und Software Engineering.<br>
                        Mit Leidenschaft.<br>
                        Aus Dresden.
                        <div class="bg-red-200 h-2 w-20 rounded-sm mt-4"></div>
                    </h1>
                    <img src="marc.jpg" alt="Marc" class="rounded-xl w-full max-w-150 lg:hidden self-center">
                    <div class="text-lg sm:text-xl">
                        Hi! Ich bin Marc, Gründer von Akimbo Creative Engineering.
                        Meine Begeisterung für die Verbindung von Gestaltung und Technologie treibt mich an.
                        Deshalb übernehme ich als Full-Stack-Entwickler alle Aspekte der Umsetzung selbst: 
                        von Design über Front- und Backend-Entwicklung bis hin zu Hosting und langfristiger Betreuung.
                    </div>
                </div>
            </div>
        </div>

        <div id="technology" class="flex flex-row items-center place-content-center gap-10 mx-10 max-sm:mx-5 max-w-7xl bg-red-50 rounded-xl px-10 py-8 shadow-2xl/50">
            <div class="flex flex-col place-content-center justify-center h-full gap-6">
                <h1 class="text-2xl sm:text-3xl font-bold">
                    Technologien
                    <div class="bg-red-200 h-2 w-20 rounded-sm mt-4"></div>
                </h1>
                <div class="text-lg sm:text-xl">
                    Dank meiner Erfahrung in einer Vielzahl von Programmiersprachen, Libraries und Frameworks finde ich den idealen Tech-Stack für dein Projekt. 
                    Bei Bedarf setze ich neben den hier aufgeführten auch weitere Technologien ein, um optimale Ergebnisse zu erzielen.
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mt-4 lg:text-center">
                    Backend
                </h2>
                <div class="w-full flex flex-col sm:flex-row place-content-evenly items-center gap-8 md:gap-12 px-6">
                    <a href="https://rubyonrails.org" class="w-full max-w-60 flex flex-col justify-center"><img src="logos/rails.svg" alt="Ruby on Rails"></a>
                    <a href="https://laravel.com" class="w-full max-w-60 flex flex-col justify-center"><img src="logos/laravel.svg" alt="Laravel"></a>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mt-6 lg:text-center">
                    Frontend
                </h2>
                <div class="w-full flex flex-row flex-wrap place-content-evenly items-center gap-8 max-sm:gap-x-4 sm:gap-x-20 md:gap-12 md:gap-x-8">
                    <a href="https://svelte.dev" class="h-15 sm:h-20 flex justify-center"><img src="logos/svelte.svg" alt="Svelte" class="max-h-[120px]"></a>
                    <a href="https://getbootstrap.com" class="h-15 sm:h-20 flex justify-center"><img src="logos/bootstrap.svg" alt="Bootstrap" class="max-h-[120px]"></a>
                    <a href="https://tailwindcss.com" class="h-10 sm:h-20 flex justify-center"><img src="logos/tailwind.svg" alt="Tailwind" class="max-h-[120px]"></a>
                    <a href="https://p5js.org" class="h-15 sm:h-20 flex justify-center"><img src="logos/p5.png" alt="p5.js" class="max-h-[120px]"></a>
                    <a href="https://gsap.com" class="h-15 sm:h-20 flex justify-center"><img src="logos/gsap.svg" alt="GSAP" class="max-h-[120px] bg-[#313131] p-3 rounded-lg"></a>
                </div>
                <h2 class="text-2xl sm:text-3xl font-bold mt-6 lg:text-center">
                    Game Engines
                </h2>
                <div class="w-full flex flex-col sm:flex-row place-content-evenly items-center gap-8 md:gap-12 px-6">
                    <a href="https://godotengine.org" class="w-full max-w-70 flex flex-col justify-center"><img src="logos/godot.svg" alt="Godot"></a>
                    <a href="https://unity.com" class="w-full max-w-70 flex flex-col justify-center"><img src="logos/unity.png" alt="Unity"></a>
                </div>
            </div>
        </div>

        <div id="contact" class="flex flex-row items-center place-content-center gap-10 mx-10 max-sm:mx-5 max-w-7xl bg-red-50 rounded-xl px-10 py-8 shadow-2xl/50">
            <div class="flex flex-col place-content-center justify-center h-full gap-6">
                <h1 class="text-2xl sm:text-3xl font-bold">
                    Kontakt
                    <div class="bg-red-200 h-2 w-20 rounded-sm mt-4"></div>
                </h1>
                <a id="contact-mail" rel="nofollow, noindex" href="to-contact-adress/">
                    <div class="email text-2xl sm:text-3xl font-semibold text-red-300">
                        hel<!--shitfuck-->lo@<span>&#97;k</span>imbo.<span>contact-sales.</span>dev
                    </div>
                </a>
                <div class="text-lg sm:text-xl">
                    Lass uns gemeinsam etwas Großartiges erschaffen!
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
        -ms-overflow-style: none;
        scrollbar-width: none; 
    }
    :global(body)::-webkit-scrollbar {
        display: none;
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
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        -ms-overflow-style: none;
        scrollbar-width: none; 
    }
    .scroller::-webkit-scrollbar {
        display: none;
    }

    .logo-name {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: -5; 
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
        z-index: -5; 
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
