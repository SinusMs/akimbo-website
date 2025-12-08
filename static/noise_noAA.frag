// noise.frag
// Banded procedural noise shader with an adaptive, shader-side anti-alias
// smoothing. Uses 3D simplex noise (z = time) and splits the noise value
// into alternating color bands. Edge smoothing is computed per-fragment
// via finite-difference estimates of the local noise derivative.

precision highp float;

// Canvas resolution in pixels
uniform vec2 uResolution;
// Two alternating band colors (RGB)
uniform vec3 uColor1;
uniform vec3 uColor2;
// Number of discrete bands to quantize the noise into
uniform float uSectionCount;
// Multiplier controlling edge smoothing strength (higher => wider smoothing)
uniform float uEdgeSmoothing;

uniform sampler2D uSimplexNoiseTexture;

void main() {
    // Use screen-space coordinates for sampling so the noise
    // maps directly to the framebuffer rather than to supplied
    // texture coordinates.
    vec2 uv = gl_FragCoord.xy / uResolution;

    // Sample noise at the current fragment 
    float n = texture2D(uSimplexNoiseTexture, uv).x;

    // Map noise to discrete band index + fractional position within band
    float x = n * uSectionCount;
    float idx = min(floor(x), uSectionCount - 1.0);

    // Choose base and neighbor band colors based on parity of index
    vec3 color = mod(idx, 2.0) < 0.5 ? uColor1 : uColor2;

    // Output final color (opaque)
    gl_FragColor = vec4(color, 1.0);
}

