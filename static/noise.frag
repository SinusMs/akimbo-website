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

    // Sample noise at the current fragment (z = time for animation)
    float n = texture2D(uSimplexNoiseTexture, uv).x;

    // Map noise to discrete band index + fractional position within band
    float x = n * uSectionCount;
    float idx = min(floor(x), uSectionCount - 1.0);
    float frac = x - idx; // fraction inside the current band [0,1)

    // Estimate local rate-of-change using finite differences. This costs
    // two additional noise samples (one pixel to the right, one up).
    // The pixel delta is computed in UV space from the resolution.
    // pixel delta in UV/screen-space units
    vec2 pixel = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

    // Neighboring noise values used to approximate derivatives
    float nRight = texture2D(uSimplexNoiseTexture, vec2(uv.x + pixel.x, uv.y)).x;
    float nUp = texture2D(uSimplexNoiseTexture, vec2(uv.x, uv.y + pixel.y)).x;
    // Absolute differences (simple finite-difference magnitude estimate)
    float dn_dx = abs(nRight - n);
    float dn_dy = abs(nUp - n);
    // Current metric: average magnitude of change in x and y
    float change = 0.5 * (dn_dx + dn_dy);

    // Width of the smoothing region (per-fragment), controlled by uniform
    float w = uEdgeSmoothing * change;
    // t is the interpolation factor for mixing band colors. Using `frac`
    // produces a one-sided blend towards the next band; using `dist`
    // would produce symmetric two-sided smoothing around the boundary.
    float t = smoothstep(0.0, w, frac);

    // Choose base and neighbor band colors based on parity of index
    float parity = mod(idx, 2.0);
    bool idxEven = parity < 0.5;
    vec3 baseBand = idxEven ? uColor1 : uColor2;
    vec3 neighborBand = idxEven ? uColor2 : uColor1;
    vec3 color = mix(baseBand, neighborBand, t);

    // Output final color (opaque)
    gl_FragColor = vec4(color, 1.0);
}

