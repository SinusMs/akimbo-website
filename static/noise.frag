precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uScale;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uSectionCount;
uniform float uEdgeSmoothing;

varying vec2 vTexCoord;

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
    return snoise(v) * 0.5 + 0.5;
}

void main() {
    float aspect = uResolution.x / uResolution.y ;
    vec2 scaled = vec2(vTexCoord.x * aspect, vTexCoord.y ) * uScale;

    float n = normalizedSnoise(vec3(scaled, uTime));

    float x = n * uSectionCount;
    float idx = min(floor(x), uSectionCount - 1.0);
    float frac = x - idx;

    float dist = min(frac, 1.0 - frac);

    // estimate local rate of change by finite differences (cost: 2 extra noise samples)
    // sample one pixel to the right and one pixel up in UV space
    vec2 pixel = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);
    vec2 scaled_right  = vec2((vTexCoord.x + pixel.x) * aspect, vTexCoord.y) * uScale;
    vec2 scaled_up     = vec2(vTexCoord.x * aspect, (vTexCoord.y + pixel.y)) * uScale;

    float n_right = normalizedSnoise(vec3(scaled_right, uTime));
    float n_up = normalizedSnoise(vec3(scaled_up, uTime));
    float dn_dx = abs(n_right - n);
    float dn_dy = abs(n_up - n);
    float change = 0.5 * (dn_dx + dn_dy);

    float w = uEdgeSmoothing * change;
    float t = smoothstep(0.0, w, frac);

    float parity = mod(idx, 2.0);
    bool idxEven = parity < 0.5;
    vec3 baseBand = idxEven ? uColor1 : uColor2;
    vec3 neighborBand = idxEven ? uColor2 : uColor1;
    vec3 color = mix(baseBand, neighborBand, t);

    gl_FragColor = vec4(color, 1.0);
}

