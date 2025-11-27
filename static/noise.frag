// noise.frag
// Banded procedural noise shader with an adaptive, shader-side anti-alias
// smoothing. Uses 3D simplex noise (z = time) and splits the noise value
// into alternating color bands. Edge smoothing is computed per-fragment
// via finite-difference estimates of the local noise derivative.

precision highp float;

// Time used to animate the noise
uniform float uTime;
// Canvas resolution in pixels
uniform vec2 uResolution;
// Scale multiplier for the noise frequency
uniform float uScale;

// Two alternating band colors (RGB)
uniform vec3 uColor1;
uniform vec3 uColor2;
// Number of discrete bands to quantize the noise into
uniform float uSectionCount;
// Multiplier controlling edge smoothing strength (higher => wider smoothing)
uniform float uEdgeSmoothing;

// Simplex 3D Noise
// by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);} 
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //  x0 = x0 - 0. + 0.0 * C 
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    // Permutations
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients
    // ( N*N points uniformly over a square, mapped onto an octahedron.)
    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
}

float normalizedSnoise(vec3 v) {
    // Map snoise output from [-1,1] to [0,1]
    return snoise(v) * 0.5 + 0.5;
}

void main() {
    // Use screen-space coordinates for sampling so the noise
    // maps directly to the framebuffer rather than to supplied
    // texture coordinates.
    vec2 uv = gl_FragCoord.xy / uResolution;
    float aspect = uResolution.x / uResolution.y;
    vec2 scaled = vec2(uv.x * aspect, uv.y) * uScale;

    // Sample noise at the current fragment (z = time for animation)
    float n = normalizedSnoise(vec3(scaled, uTime));

    // Map noise to discrete band index + fractional position within band
    float x = n * uSectionCount;
    float idx = min(floor(x), uSectionCount - 1.0);
    float frac = x - idx; // fraction inside the current band [0,1)

    // Distance-to-nearest-boundary (for symmetric smoothing)
    // float dist = min(frac, 1.0 - frac);

    // Estimate local rate-of-change using finite differences. This costs
    // two additional noise samples (one pixel to the right, one up).
    // The pixel delta is computed in UV space from the resolution.
    // pixel delta in UV/screen-space units
    vec2 pixel = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);
    // neighbors in screen-space (one pixel to the right / one pixel up)
    vec2 scaledRight = vec2((uv.x + pixel.x) * aspect, uv.y) * uScale;
    vec2 scaledUp = vec2(uv.x * aspect, (uv.y + pixel.y)) * uScale;

    // Neighboring noise values used to approximate derivatives
    float nRight = normalizedSnoise(vec3(scaledRight, uTime));
    float nUp = normalizedSnoise(vec3(scaledUp, uTime));
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
    vec4 baseBand = idxEven ? vec4(uColor1, 1.0) : vec4(uColor2, 0.0);
    vec4 neighborBand = idxEven ? vec4(uColor2, 0.0) : vec4(uColor1, 1.0);
    vec4 color = mix(baseBand, neighborBand, t);

    // Output final color (opaque)
    gl_FragColor = color;
}

