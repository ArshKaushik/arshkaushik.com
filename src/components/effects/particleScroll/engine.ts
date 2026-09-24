// WebGL2 "particle sand" scroll reveal, adapted from canvas-ui's ParticleScroll
// (https://github.com/DavidHDev/canvas-ui/tree/main/src/lib/ParticleScroll).
// The shaders and the per-row progress logic are upstream's; what changed is
// WHERE the pixels come from and WHAT the canvas covers:
//
//   • Upstream captures its content live, every frame, with the experimental
//     HTML-in-Canvas API (drawElementImage) — Chrome-behind-a-flag only. Here
//     the content is a ONE-TIME snapshot of the whole card (see snapshot.ts),
//     kept on the GPU as a texture and sampled at "card y = viewport y +
//     how far the card has scrolled".
//   • Upstream's canvas is an opaque replacement for its content. Here the
//     WHOLE card dissolves — its white surface and dashed border too — so
//     what's behind the card (the dimmed home page) shows through the dust.
//     Two layers share the work, split at a "cut" line: the first row, from
//     the top, that hasn't fully landed yet.
//       – Above the cut: the real, live card, untouched. The canvas draws
//         nothing there.
//       – From the cut down: the live card is hidden with a CSS mask, and the
//         canvas draws it instead — landed cells straight from the snapshot,
//         unlanded ones as flying grains over a transparent background.
//     Once every row has landed the mask is removed entirely, so at rest
//     you're looking at the real DOM, exactly as without the effect.
//   • Upstream's grains stay inside its box. Here the canvas spans the whole
//     viewport, so grains near the card's edges can drift out over the page.
//   • Upstream scrolls an inner element. Here the scroll container is the
//     overlay dialog, so scroll is read from it and converted to card space.
//
// Upstream license (MIT + Commons Clause), required notice:
//   Copyright (c) 2026 David Haz. Permission is hereby granted, free of
//   charge, to any person obtaining a copy of this software and associated
//   documentation files (the "Software"), to deal in the Software without
//   restriction, including without limitation the rights to use, copy,
//   modify, merge, publish, and distribute the Software as part of an
//   application, website, or product, subject to the following conditions:
//   The above copyright notice and this permission notice shall be included
//   in all copies or substantial portions of the Software. Commons Clause:
//   you may not sell, sublicense, or redistribute the components themselves.
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

export interface ParticleScrollOptions {
    /** Viewport fraction of the formation line. Content assembles as it scrolls up past this line and dissolves back below it. */
    point?: number;
    /** Height in CSS pixels of the transition band where particles progressively reassemble. */
    band?: number;
    /** Grain spacing in CSS pixels. Smaller values mean finer, denser sand. */
    density?: number;
    /** Size of fully scattered dust grains in CSS pixels. Grains grow to cover their cell as they land. */
    size?: number;
    /** Maximum distance in CSS pixels particles scatter from their home position. */
    spread?: number;
    /** Downward bias of the scattered cloud (-1 to 1), like sand settling. Negative values lift it. */
    gravity?: number;
    /** Idle float speed of scattered particles (0 to 1). 0 freezes the cloud. */
    drift?: number;
    /** Sideways arc in CSS pixels particles take while flying home. */
    swirl?: number;
    /** Per-particle randomness of reassembly timing (0 to 1). */
    stagger?: number;
    /** Opacity of fully scattered particles (0 to 1). */
    fade?: number;
    /** Seconds a row of dust takes to condense into the page once the reveal reaches it. */
    settle?: number;
    /** Seconds the damped scroll takes to catch up with the real scroll. Higher feels more fluid. */
    smoothing?: number;
    /** Seconds the dust edge takes to rise from the bottom of the screen to the formation line when the overlay opens (eased out). 0 = no rise: the whole lower area dissolves at once. */
    rise?: number;
    /** Seconds a row takes to blow away into dust (scrolling back up, or on open). The reverse of `settle`. */
    dissolve?: number;
    /** How strongly a fast scroll flings loose dust along with it. 0 = dust ignores scroll speed. */
    kick?: number;
    /** How far (CSS px) loose grains float around while idle. `drift` sets how fast. */
    wobble?: number;
    /** Colour softness of loose grains. 0 = exact source pixel (crisp, flickery); higher = softer, averaged colour. */
    blur?: number;
    /** How grains spread within `spread`. Higher = most stay close to home, a few fly far; lower (towards 1) = evenly spread. */
    clump?: number;
    /** How early before the end of the scroll everything starts forming, as a fraction of screen height. */
    endZone?: number;
}

export interface ParticleScrollElements {
    /** The element that actually scrolls (the overlay dialog). */
    scroller: HTMLElement;
    /** The element that was snapshotted (the card). Its live rect positions everything. */
    card: HTMLElement;
    /** Canvas the effect renders into. Absolutely positioned inside the scroller; the engine sizes and moves it. */
    output: HTMLCanvasElement;
}

/** A rendered image of the card, plus the CSS size it was taken at. */
export interface CardSnapshot {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
}

export interface ParticleScrollInstance {
    /** Largest texture edge this GPU accepts — the snapshot must fit its WIDTH in this. */
    maxTextureSize: number;
    /** Upload a new snapshot (the engine takes ownership and frees the canvas). */
    setSnapshot: (snapshot: CardSnapshot) => void;
    /** Update effect options live. */
    setOptions: (options: ParticleScrollOptions) => void;
    /** Stop the loop and release all GPU resources. */
    destroy: () => void;
}

// Upstream's defaults. Override any of them per use through the component's
// `options` prop (see CaseStudyOverlay.tsx) — anything left out keeps these.
const DEFAULTS: Required<ParticleScrollOptions> = {
    point: 0.88, // Formation line, as a fraction of screen height from the top (0 = top, 1 = bottom). Lower = more of the card is dust.
    band: 550, // Height (px) of the zone below the line where grains are part-way home. Bigger = softer, longer transition.
    density: 2, // Grain spacing (px). 1 = finest sand (most grains, most GPU work); 3–4 = chunkier. Minimum 1.
    size: 1.25, // Size (px) of a fully scattered grain. Bigger = dust is easier to see. Grains grow to fill their cell as they land.
    spread: 4000, // How far (px) grains scatter from their home spot. Bigger = wider, more airy cloud.
    gravity: 0.2, // Pull on the scattered cloud, -1 to 1. Positive sinks it (sand settling), negative lifts it, 0 = none.
    drift: 0.8, // Speed of the idle floating of scattered grains, 0 to 1. 0 = frozen dust.
    swirl: 600, // Sideways arc (px) grains take while flying home. 0 = straight lines.
    stagger: 0.8, // How random each grain's landing time is, 0 to 1. 0 = each row lands as one neat line; higher = more organic.
    fade: 0.85, // Opacity of fully scattered grains, 0 to 1. 1 = solid; lower = fainter dust.
    settle: 1.8, // Seconds a row takes to form once it's above the line. Lower = snappier; higher = slower, dreamier.
    smoothing: 0.4, // Seconds the effect trails your actual scroll. 0 = follows instantly; higher = floatier, more lag.
    rise: 4.0, // Not upstream: seconds the dust edge takes to rise from the screen's bottom to the line on open (ease-out). 0.52 = the site's shared motion pace; 0 = no rise (whole area dissolves at once).
    // The six below were hard-coded numbers inside upstream's engine. Each
    // default reproduces how the effect looked before they existed.
    dissolve: 1.08, // Seconds a row takes to blow away into dust (the reverse of `settle`). Was always 60% of settle (1.8 × 0.6). Lower = snappier burst.
    kick: 1, // How strongly a fast scroll flings loose dust along with it. 0 = dust ignores scroll speed; 2 = double the fling.
    wobble: 400, // How far (px) loose grains float while idle; `drift` sets the speed. Was derived from spread (4000 × 0.05 + 2.5); now separate, so changing spread no longer changes it.
    blur: 1.5, // Colour softness of loose grains. 0 = exact pixel it came from (crisp but flickery); 3 = very soft, averaged colour.
    clump: 2.4, // How grains spread within `spread`. Higher = most stay close with a few flying far; 1 = evenly spread. Keep above 0.
    endZone: 0.4, // How early (fraction of screen height before the end) everything starts forming, so it's whole when you reach the bottom. Bigger = forms earlier.
};

// How many consecutive frames the card must sit still before the intro arms
// (~50ms at 60fps). More than one, so the spring's brief pause at the top of
// its overshoot can't be mistaken for the end of the slide.
const STILL_FRAMES_TO_ARM = 3;

const HASH = `
float hash (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}`;

const QUAD_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Reads the snapshot at a position in card space (CSS px from the card's
// top-left). The snapshot lives in a TEXTURE ARRAY — a stack of equally tall
// slices ("layers") — because a ~3400px-tall card at 2x can exceed the
// tallest single texture some GPUs allow. This turns a card position into
// (layer, position-within-layer). Usually there's just one layer.
const SAMPLE = `
uniform sampler2DArray uContent;
uniform vec2 uCard;
uniform float uTileH;
uniform float uLayers;
vec4 sampleCard (vec2 cardPx, float lod) {
  cardPx = clamp(cardPx, vec2(0.0), uCard - 0.001);
  float layer = min(floor(cardPx.y / uTileH), uLayers - 1.0);
  vec2 uv = vec2(cardPx.x / uCard.x, (cardPx.y - layer * uTileH) / uTileH);
  return textureLod(uContent, vec3(uv, layer), lod);
}`;

// The base pass, one fragment per screen pixel. Above the cut (and outside
// the card) it draws nothing — the live card, or the page, shows through.
// From the cut down, the live card is masked away, so this pass stands in
// for it: a cell whose grain has landed shows the snapshot's pixel; a cell
// still in flight is left transparent, and its grain is drawn by the next
// pass. Output is PREMULTIPLIED alpha (colour already multiplied by
// opacity), which is what a default WebGL canvas hands the compositor.
const BASE_FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uRowTex;
uniform vec2 uRes;
uniform float uCardX;
uniform float uDensity;
uniform float uRowCount;
uniform float uStagger;
uniform float uScroll;
uniform float uWinStart;
uniform float uCut;
${SAMPLE}
${HASH}
void main () {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 cardPx = vec2(px.x - uCardX, px.y + uScroll);
  if (cardPx.x < 0.0 || cardPx.x >= uCard.x
      || cardPx.y < uCut || cardPx.y >= uCard.y) {
    outColor = vec4(0.0);
    return;
  }
  vec2 cell = floor(cardPx / uDensity);
  float h1 = hash(cell);
  float d = h1 * uStagger;
  int row = int(clamp(cell.y - uWinStart, 0.0, uRowCount - 1.0));
  float p = texelFetch(uRowTex, ivec2(row, 0), 0).r;
  float t = clamp((p - d) / max(1.0 - d, 1e-3), 0.0, 1.0);
  float landed = step(0.9995, t);
  vec4 tex = sampleCard(cardPx, 0.0);
  outColor = vec4(tex.rgb * tex.a, tex.a) * landed;
}`;

// One point per grain cell in the visible window (upstream, apart from the
// card sitting at uCardX inside a viewport-wide canvas, where upstream's box
// started at x = 0). Works out where the grain is on its flight between its
// scattered position and its home cell.
const POINT_VERT = `#version 300 es
precision highp float;
uniform sampler2D uRowTex;
uniform vec2 uRes;
uniform vec2 uGrid;
uniform float uCardX;
uniform float uCardW;
uniform float uDensity;
uniform float uStagger;
uniform float uSpread;
uniform float uGravity;
uniform float uDrift;
uniform float uSwirl;
uniform float uTime;
uniform float uFade;
uniform float uSize;
uniform float uDpr;
uniform float uLag;
uniform float uWobble;
uniform float uBlur;
uniform float uClump;
uniform float uScroll;
uniform float uWinStart;
out vec2 vCenter;
out float vSize;
out float vAlpha;
out float vLod;
out float vMerge;
${HASH}
void main () {
  float fid = float(gl_VertexID);
  vec2 local = vec2(mod(fid, uGrid.x), floor(fid / uGrid.x));
  vec2 cell = vec2(local.x, local.y + uWinStart);
  float h1 = hash(cell);
  float h2 = hash(cell + vec2(1.7, 9.1));
  float h3 = hash(cell + vec2(5.5, 2.9));
  float h4 = hash(cell + vec2(8.4, 4.2));
  float d = h1 * uStagger;
  vec2 home = vec2(
    (cell.x + 0.5) * uDensity + uCardX,
    (cell.y + 0.5) * uDensity - uScroll
  );
  int row = int(clamp(local.y, 0.0, uGrid.y - 1.0));
  float p = texelFetch(uRowTex, ivec2(row, 0), 0).r;
  float t = clamp((p - d) / max(1.0 - d, 1e-3), 0.0, 1.0);
  float e = 1.0 - pow(1.0 - t, 3.0);
  float vis = (1.0 - step(0.9995, t))
    * step(home.x - uCardX, uCardW)
    * step(home.y, uRes.y)
    * step(-uDensity, home.y);
  if (vis < 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vCenter = vec2(0.0);
    vSize = 0.0;
    vAlpha = 0.0;
    vLod = 0.0;
    vMerge = 0.0;
    return;
  }
  vec2 dir = normalize(vec2(h2 - 0.5, h3 - 0.5) + vec2(1e-4, 0.0));
  float reach = 0.08 + 0.92 * pow(h4, uClump);
  vec2 off = dir * uSpread * reach;
  off.y += uGravity * uSpread * (0.25 + 0.75 * h4);
  vec2 scat = home + off;
  vec2 pos = mix(scat, home, e);
  vec2 perp = vec2(-dir.y, dir.x);
  pos += perp * (h2 - 0.5) * 2.0 * uSwirl * sin(e * 3.14159);
  float tt = uTime * uDrift;
  float amp = (1.0 - e) * uWobble;
  pos += vec2(
    sin(tt * (4.0 + 5.0 * h2) + h3 * 40.0),
    cos(tt * (3.5 + 5.5 * h3) + h2 * 40.0)
  ) * amp;
  pos.y += uLag * (1.0 - e) * (0.5 + 0.5 * h4);
  pos += vec2(h4 - 0.5, h1 - 0.5) * uDensity * 3.0
    * (1.0 - smoothstep(0.5, 0.85, t));
  float grow = smoothstep(0.55, 1.0, e);
  float sizeCss = mix(uSize, uDensity * 1.3, grow);
  vCenter = home;
  vSize = sizeCss;
  vAlpha = mix(uFade, 1.0, e);
  vLod = (1.0 - e) * uBlur;
  vMerge = smoothstep(0.75, 0.97, t);
  gl_Position = vec4(
    pos.x / uRes.x * 2.0 - 1.0,
    1.0 - pos.y / uRes.y * 2.0,
    0.0,
    1.0
  );
  gl_PointSize = max(sizeCss * uDpr, 1.0);
}`;

// Colours each grain from the snapshot at its HOME position — including the
// card's white surface, so the card itself turns to sand, not just its text.
const POINT_FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform float uCardX;
uniform float uScroll;
in vec2 vCenter;
in float vSize;
in float vAlpha;
in float vLod;
in float vMerge;
out vec4 outColor;
${SAMPLE}
void main () {
  vec2 o = gl_PointCoord - 0.5;
  vec4 tex = sampleCard(vCenter + o * vSize + vec2(-uCardX, uScroll), vLod);
  float circle = 1.0 - smoothstep(0.25, 0.5, length(o));
  float mask = mix(circle, 1.0, vMerge);
  float a = vAlpha * mask * tex.a;
  if (a < 0.01) discard;
  outColor = vec4(tex.rgb * a, a);
}`;

export function createParticleScroll(
    elements: ParticleScrollElements,
    options: ParticleScrollOptions = {},
    onContextLost?: () => void,
): ParticleScrollInstance | null {
    const config = { ...DEFAULTS, ...options };
    const { scroller, card, output } = elements;

    // premultipliedAlpha stays at its default (true) — see BASE_FRAG. The
    // canvas is transparent wherever nothing is drawn.
    const gl = output.getContext("webgl2", {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
    });
    if (!gl || gl.isContextLost()) return null;

    function compile(type: number, text: string): WebGLShader {
        const shader = gl!.createShader(type)!;
        gl!.shaderSource(shader, text);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
            throw new Error(
                `ParticleScroll shader error: ${gl!.getShaderInfoLog(shader)}`,
            );
        }
        return shader;
    }

    function link(vertText: string, fragText: string) {
        const vert = compile(gl!.VERTEX_SHADER, vertText);
        const frag = compile(gl!.FRAGMENT_SHADER, fragText);
        const program = gl!.createProgram()!;
        gl!.attachShader(program, vert);
        gl!.attachShader(program, frag);
        gl!.linkProgram(program);
        if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
            throw new Error(
                `ParticleScroll link error: ${gl!.getProgramInfoLog(program)}`,
            );
        }
        const uniforms: Record<string, WebGLUniformLocation> = {};
        const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const info = gl!.getActiveUniform(program, i)!;
            uniforms[info.name] = gl!.getUniformLocation(program, info.name)!;
        }
        return { program, vert, frag, uniforms };
    }

    // A shader that won't compile means no effect — the caller falls back to
    // the plain card rather than showing a half-working canvas.
    let base: ReturnType<typeof link>;
    let points: ReturnType<typeof link>;
    try {
        base = link(QUAD_VERT, BASE_FRAG);
        points = link(POINT_VERT, POINT_FRAG);
    } catch (error) {
        console.error(error);
        return null;
    }

    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;

    const quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(quadVao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // Points need no vertex data at all — the vertex shader derives each
    // grain's cell from gl_VertexID — but WebGL still wants a VAO bound.
    const pointVao = gl.createVertexArray()!;

    // The snapshot texture. Created fresh per snapshot (texStorage3D makes an
    // immutable, fixed-size texture), so it starts null.
    let contentTexture: WebGLTexture | null = null;
    // The snapshot's CSS size, and how tall one texture layer is in CSS px.
    let snap: {
        width: number;
        height: number;
        tileH: number;
        layers: number;
    } | null = null;

    // A 1-pixel-tall texture holding each visible row's progress (0 = dust,
    // 1 = landed), re-uploaded every frame for the shaders to look up.
    const rowTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, rowTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let rowProgress = new Float32Array(0);
    let rowWindow = new Float32Array(0);
    let rowsAnimating = false;
    let rowsAssembled = false;

    // Hides the live card from `cut` (CSS px from the card's top) downward,
    // or un-hides it entirely when cut is null. A mask, not clip-path, on
    // purpose: a clip-path also stops clicks from reaching the clipped-away
    // part, so a click on a dissolved area would fall through to the
    // backdrop and CLOSE the overlay. A mask is purely visual — hidden text
    // and links stay selectable and clickable. The mask moves with the card
    // when it scrolls, so rows scrolling in from below arrive already hidden
    // even before the next frame is drawn. Only written when it changes.
    let appliedCut: number | null = null;
    function applyMask(cut: number | null) {
        if (cut === appliedCut) return;
        appliedCut = cut;
        const value =
            cut === null
                ? ""
                : `linear-gradient(to bottom, #000 ${cut}px, transparent ${cut}px)`;
        card.style.setProperty("mask-image", value);
        card.style.setProperty("-webkit-mask-image", value);
    }

    // Live geometry, re-read every frame. `rect` is the card's box on screen
    // (getBoundingClientRect includes the slide-up transform, which is how
    // the intro can tell when the slide has finished).
    let rect = card.getBoundingClientRect();

    // The canvas covers the dialog's whole visible area (clientWidth leaves
    // out a classic scrollbar), so grains can drift past the card's edges.
    //
    // WHY it lives INSIDE the scrolling content (absolute + moved down by
    // scrollTop each frame) rather than `position: fixed`: the browser
    // scrolls the page off the main thread, so for a frame or so the card —
    // and its mask — has already moved while this canvas still shows the
    // previous frame. A fixed canvas stays put during that lag, which opened
    // a gap right under the mask's edge: a grey strip of the page behind,
    // visible whenever you scrolled down. Inside the scrolling content, the
    // browser moves the canvas together with the card and the mask, so they
    // stay lined up until the next frame re-centres it.
    //
    // `canvasOffset` is where the canvas's top sits relative to the top of
    // the screen — normally 0. It's only non-zero if the canvas had to be
    // held back so its bottom never pokes past the end of the content (which
    // would make the dialog scroll further; see the clamp below).
    let canvasOffset = 0;
    function syncCanvasBox() {
        const cssWidth = scroller.clientWidth;
        const cssHeight = scroller.clientHeight;
        if (output.style.width !== `${cssWidth}px`) {
            output.style.width = `${cssWidth}px`;
        }
        if (output.style.height !== `${cssHeight}px`) {
            output.style.height = `${cssHeight}px`;
        }
        // End of the dialog's real content: the card's bottom plus the
        // dialog's bottom padding, in scrolled-content coordinates.
        const scrollTop = scroller.scrollTop;
        const contentEnd =
            scrollTop +
            rect.bottom +
            parseFloat(getComputedStyle(scroller).paddingBottom || "0");
        const top = Math.max(0, Math.min(scrollTop, contentEnd - cssHeight));
        canvasOffset = top - scrollTop;
        output.style.transform = `translate3d(0, ${top}px, 0)`;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(cssWidth * dpr));
        const height = Math.max(1, Math.round(cssHeight * dpr));
        if (output.width !== width || output.height !== height) {
            output.width = width;
            output.height = height;
        }
    }

    // A snapshot only lines up with the live card if the card is still the
    // size it was when captured. After a breakpoint change it isn't, so the
    // effect switches itself off until the caller hands over a new one.
    function snapshotMatches() {
        return (
            snap !== null &&
            Math.abs(rect.width - snap.width) < 0.5 &&
            Math.abs(rect.height - snap.height) < 0.5
        );
    }

    // Scroll, in two coordinate spaces. The dialog's own scrollTop is what
    // gets smoothed (so a transform on the card never feels "laggy"); the
    // card-space scroll is then "dialog scroll minus where the card starts".
    // cardOffset = the card's top inside the dialog's scrolled content.
    let scrollSmooth = scroller.scrollTop;
    function cardOffset() {
        return scroller.scrollTop + rect.top;
    }

    let time = 0;
    let introDone = false;
    let introReady = false;
    // The rise: 0 → 1 over `config.rise` seconds once the intro arms. While it
    // runs, the formation line eases up from below the screen to its resting
    // height, so the dust edge slides up from the bottom instead of the whole
    // lower area bursting into dust at once.
    let riseT = 0;

    function rowTargetFor(cardRowY: number) {
        if (!introDone) return 1;
        const h = Math.max(output.clientHeight, 1);
        const band = Math.max(config.band, 1);
        const max = scroller.scrollHeight - scroller.clientHeight;
        let line = Math.min(Math.max(config.point, 0), 1) * h;
        if (max <= 1) {
            line = h + band;
        } else {
            // Near the end of the scroll, slide the formation line down past
            // the bottom of the screen so every row is assembled when you
            // reach the end — nothing is ever left as dust.
            const endZone = h * Math.min(Math.max(config.endZone, 0.05), 1);
            const endP = Math.min(
                Math.max((scrollSmooth - (max - endZone)) / endZone, 0),
                1,
            );
            const rest = line;
            line += (h + band - rest) * endP * endP;
            // During the opening rise, the line starts at the bottom edge of
            // the screen (nothing is dust yet — a row only starts dissolving
            // once the line has passed above it) and eases up to its resting
            // height. Cubic ease-out: quick at first, gently slowing to a
            // stop. Whichever of the two pushes holds the line lower wins.
            const riseLeft = Math.pow(1 - riseT, 3);
            line = Math.max(line, rest + (h - rest) * riseLeft);
        }
        const vy = cardRowY - (scrollSmooth - cardOffset());
        return Math.min(Math.max((line + band - vy) / band, 0), 1);
    }

    function updateRows(
        dt: number,
        density: number,
        winStart: number,
        winLen: number,
    ) {
        const docRows = Math.max(1, Math.ceil(snap!.height / density));
        if (rowProgress.length !== docRows) {
            const next = new Float32Array(docRows);
            for (let i = 0; i < docRows; i++) {
                next[i] = rowTargetFor((i + 0.5) * density);
            }
            rowProgress = next;
        }
        if (rowWindow.length !== winLen) rowWindow = new Float32Array(winLen);
        rowsAnimating = false;
        let minP = 1;
        const settle = Math.max(config.settle, 0.05);
        const dissolve = Math.max(config.dissolve, 0.05);
        for (let i = 0; i < docRows; i++) {
            const target = rowTargetFor((i + 0.5) * density);
            let p = rowProgress[i];
            const inWin = i >= winStart - 4 && i < winStart + winLen + 4;
            if (p !== target) {
                if (!inWin) {
                    p = target;
                } else {
                    if (p < target) p = Math.min(p + dt / settle, target);
                    else p = Math.max(p - dt / dissolve, target);
                    if (p !== target) rowsAnimating = true;
                }
                rowProgress[i] = p;
            }
            if (inWin && p < minP) minP = p;
        }
        rowsAssembled = minP >= 0.9995;
        // Rows outside the card (above its top / below its bottom) count as
        // landed, which the base pass renders as transparent.
        rowWindow.fill(1);
        const from = Math.min(Math.max(winStart, 0), docRows);
        const to = Math.min(winStart + winLen, docRows);
        if (to > from)
            rowWindow.set(rowProgress.subarray(from, to), from - winStart);
        gl!.bindTexture(gl!.TEXTURE_2D, rowTex);
        gl!.texImage2D(
            gl!.TEXTURE_2D,
            0,
            gl!.R32F,
            winLen,
            1,
            0,
            gl!.RED,
            gl!.FLOAT,
            rowWindow,
        );
    }

    function clear() {
        gl!.viewport(0, 0, output.width, output.height);
        gl!.clearColor(0, 0, 0, 0);
        gl!.clear(gl!.COLOR_BUFFER_BIT);
    }

    function render(dt: number) {
        syncCanvasBox();
        clear();
        if (!snapshotMatches() || !contentTexture) {
            applyMask(null);
            return;
        }

        // Canvas size (the viewport) vs card size: the card decides how many
        // grains there are, the canvas decides where they can fly.
        const cw = Math.max(output.clientWidth, 1);
        const h = Math.max(output.clientHeight, 1);
        const dpr = output.width / cw;
        const w = Math.max(rect.width, 1);
        const density = Math.max(
            Math.max(config.density, 1),
            Math.sqrt((w * h) / 800000),
        );
        // Card-space scroll: how far the card's top is ABOVE the viewport top
        // (negative while the card still starts lower down the screen).
        // (Measured from the canvas's own top, which is normally the screen's.)
        const scroll = canvasOffset - rect.top;
        const gridX = Math.ceil(w / density);
        const winStart = Math.floor(scroll / density);
        const winLen = Math.ceil(h / density) + 2;
        const stagger = Math.min(Math.max(config.stagger, 0), 0.95);
        updateRows(dt, density, winStart, winLen);

        // The cut: the first row (from the card's top) that hasn't fully
        // landed. A row whose progress is ≥ 0.9999 has every grain home —
        // even the latest-starting one (see `t` in the shaders).
        let cutRow = -1;
        for (let i = 0; i < rowProgress.length; i++) {
            if (rowProgress[i] < 0.9999) {
                cutRow = i;
                break;
            }
        }
        const cut = cutRow < 0 ? null : cutRow * density;
        applyMask(cut);
        if (cut === null) return;

        gl!.activeTexture(gl!.TEXTURE1);
        gl!.bindTexture(gl!.TEXTURE_2D, rowTex);
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D_ARRAY, contentTexture);

        gl!.disable(gl!.BLEND);
        gl!.useProgram(base.program);
        gl!.bindVertexArray(quadVao);
        gl!.uniform1i(base.uniforms.uRowTex, 1);
        gl!.uniform1i(base.uniforms.uContent, 0);
        gl!.uniform2f(base.uniforms.uRes, cw, h);
        gl!.uniform1f(base.uniforms.uCardX, rect.left);
        gl!.uniform1f(base.uniforms.uDensity, density);
        gl!.uniform1f(base.uniforms.uRowCount, winLen);
        gl!.uniform1f(base.uniforms.uStagger, stagger);
        gl!.uniform1f(base.uniforms.uScroll, scroll);
        gl!.uniform1f(base.uniforms.uWinStart, winStart);
        gl!.uniform1f(base.uniforms.uCut, cut);
        gl!.uniform2f(base.uniforms.uCard, snap!.width, snap!.height);
        gl!.uniform1f(base.uniforms.uTileH, snap!.tileH);
        gl!.uniform1f(base.uniforms.uLayers, snap!.layers);
        gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

        if (rowsAssembled) return;
        // Standard "paint over" for premultiplied colour: new grain on top,
        // whatever was there showing through its transparent parts.
        gl!.enable(gl!.BLEND);
        gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
        gl!.useProgram(points.program);
        gl!.bindVertexArray(pointVao);
        gl!.uniform1i(points.uniforms.uRowTex, 1);
        gl!.uniform1i(points.uniforms.uContent, 0);
        gl!.uniform2f(points.uniforms.uRes, cw, h);
        gl!.uniform2f(points.uniforms.uGrid, gridX, winLen);
        gl!.uniform1f(points.uniforms.uCardX, rect.left);
        gl!.uniform1f(points.uniforms.uCardW, w);
        gl!.uniform1f(points.uniforms.uDensity, density);
        gl!.uniform1f(points.uniforms.uStagger, stagger);
        gl!.uniform1f(points.uniforms.uSpread, Math.max(config.spread, 0));
        gl!.uniform1f(
            points.uniforms.uGravity,
            Math.min(Math.max(config.gravity, -1), 1),
        );
        gl!.uniform1f(points.uniforms.uDrift, Math.max(config.drift, 0));
        gl!.uniform1f(points.uniforms.uSwirl, Math.max(config.swirl, 0));
        gl!.uniform1f(points.uniforms.uTime, time);
        gl!.uniform1f(
            points.uniforms.uFade,
            Math.min(Math.max(config.fade, 0), 1),
        );
        gl!.uniform1f(points.uniforms.uSize, Math.max(config.size, 0.5));
        gl!.uniform1f(points.uniforms.uDpr, dpr);
        gl!.uniform1f(points.uniforms.uLag, lag * Math.max(config.kick, 0));
        gl!.uniform1f(points.uniforms.uWobble, Math.max(config.wobble, 0));
        gl!.uniform1f(points.uniforms.uBlur, Math.max(config.blur, 0));
        gl!.uniform1f(points.uniforms.uClump, Math.max(config.clump, 0.1));
        gl!.uniform1f(points.uniforms.uScroll, scroll);
        gl!.uniform1f(points.uniforms.uWinStart, winStart);
        gl!.uniform2f(points.uniforms.uCard, snap!.width, snap!.height);
        gl!.uniform1f(points.uniforms.uTileH, snap!.tileH);
        gl!.uniform1f(points.uniforms.uLayers, snap!.layers);
        gl!.drawArrays(gl!.POINTS, 0, gridX * winLen);
        gl!.bindVertexArray(quadVao);
        gl!.disable(gl!.BLEND);
    }

    let raf = 0;
    let lastTime = performance.now();
    let destroyed = false;
    let running = false;
    let lag = 0;
    let lastScrollTop = scroller.scrollTop;
    let lastRectTop = rect.top;
    let stillFrames = 0;

    function frame(now: number) {
        if (destroyed) return;
        const delta = Math.min((now - lastTime) / 1000, 1 / 30);
        lastTime = now;
        time += delta;
        rect = card.getBoundingClientRect();
        // Is the card moving on screen WITHOUT a scroll (the slide-up)? The
        // loop keeps running while it does, to notice when it stops (see the
        // intro below).
        const moving = Math.abs(rect.top - lastRectTop) > 0.01;
        lastRectTop = rect.top;
        const scrollTop = scroller.scrollTop;
        lag += scrollTop - lastScrollTop;
        lastScrollTop = scrollTop;
        lag *= Math.exp(-delta / 0.22);
        lag = Math.min(Math.max(lag, -400), 400);
        if (Math.abs(lag) < 0.1) lag = 0;
        const tau = config.smoothing;
        const k = tau <= 0 ? 1 : 1 - Math.exp(-delta / Math.max(tau, 1e-4));
        scrollSmooth += (scrollTop - scrollSmooth) * k;
        if (Math.abs(scrollTop - scrollSmooth) < 0.5) scrollSmooth = scrollTop;
        render(delta);
        // The intro. Until it's armed, every row counts as landed
        // (rowTargetFor returns 1), so the canvas draws nothing and the card
        // is simply the live card. It arms once the snapshot is in AND the
        // card has stopped moving for a few frames — i.e. the slide-up has
        // finished. Then rows below the formation line visibly blow away, in
        // place. Arming mid-slide looked broken: the slide is animated by the
        // browser outside JavaScript, while this canvas redraws from
        // JavaScript, so during the slide the two drift apart and the card
        // tore in two. (Upstream instead waited a flat second after capture.)
        stillFrames = moving ? 0 : stillFrames + 1;
        const justArmed =
            !introDone && introReady && stillFrames >= STILL_FRAMES_TO_ARM;
        if (justArmed) introDone = true;
        if (introDone && riseT < 1) {
            riseT =
                config.rise > 0 ? Math.min(riseT + delta / config.rise, 1) : 1;
        }
        // Stop the loop once nothing can change on screen: no snapshot to
        // draw (or a stale one), or everything landed and at rest. Scattered
        // dust keeps it running — the grains idly drift — and so does the
        // opening rise until it finishes.
        const idle =
            !snapshotMatches() ||
            (scrollSmooth === scrollTop &&
                !rowsAnimating &&
                rowsAssembled &&
                (introDone || !introReady) &&
                riseT >= 1 &&
                lag === 0);
        // (justArmed: on the arming frame every row is still "landed", which
        // would otherwise look idle and stop the loop before the dissolve.)
        if (idle && !moving && !justArmed) {
            running = false;
            return;
        }
        raf = requestAnimationFrame(frame);
    }

    function start() {
        if (destroyed || running) return;
        running = true;
        lastTime = performance.now();
        raf = requestAnimationFrame(frame);
    }

    function uploadSnapshot(snapshot: CardSnapshot) {
        const src = snapshot.canvas;
        const width = src.width;
        const height = src.height;
        // Fewest equal-height layers that each fit under the GPU's limit.
        const layers = Math.ceil(height / maxTextureSize);
        if (width > maxTextureSize || layers > maxLayers) {
            throw new Error("ParticleScroll: snapshot too large for this GPU");
        }
        const tileHpx = Math.ceil(height / layers);
        const levels = Math.floor(Math.log2(Math.max(width, tileHpx))) + 1;

        const texture = gl!.createTexture()!;
        gl!.bindTexture(gl!.TEXTURE_2D_ARRAY, texture);
        gl!.texStorage3D(
            gl!.TEXTURE_2D_ARRAY,
            levels,
            gl!.RGBA8,
            width,
            tileHpx,
            layers,
        );
        // One layer → upload the snapshot canvas directly. Several → copy
        // each horizontal slice into a scratch canvas and upload that.
        if (layers === 1) {
            gl!.texSubImage3D(
                gl!.TEXTURE_2D_ARRAY,
                0,
                0,
                0,
                0,
                width,
                height,
                1,
                gl!.RGBA,
                gl!.UNSIGNED_BYTE,
                src,
            );
        } else {
            const slice = document.createElement("canvas");
            slice.width = width;
            slice.height = tileHpx;
            const ctx = slice.getContext("2d")!;
            for (let layer = 0; layer < layers; layer++) {
                ctx.clearRect(0, 0, width, tileHpx);
                ctx.drawImage(src, 0, -layer * tileHpx);
                gl!.texSubImage3D(
                    gl!.TEXTURE_2D_ARRAY,
                    0,
                    0,
                    0,
                    layer,
                    width,
                    tileHpx,
                    1,
                    gl!.RGBA,
                    gl!.UNSIGNED_BYTE,
                    slice,
                );
            }
            slice.width = slice.height = 0;
        }
        // Mipmaps = pre-shrunk copies of the texture. Scattered grains sample
        // a blurrier level (vLod), so a dust cloud shows averaged colour
        // instead of flickering single pixels.
        gl!.texParameteri(
            gl!.TEXTURE_2D_ARRAY,
            gl!.TEXTURE_MIN_FILTER,
            gl!.LINEAR_MIPMAP_LINEAR,
        );
        gl!.texParameteri(
            gl!.TEXTURE_2D_ARRAY,
            gl!.TEXTURE_MAG_FILTER,
            gl!.LINEAR,
        );
        gl!.texParameteri(
            gl!.TEXTURE_2D_ARRAY,
            gl!.TEXTURE_WRAP_S,
            gl!.CLAMP_TO_EDGE,
        );
        gl!.texParameteri(
            gl!.TEXTURE_2D_ARRAY,
            gl!.TEXTURE_WRAP_T,
            gl!.CLAMP_TO_EDGE,
        );
        gl!.generateMipmap(gl!.TEXTURE_2D_ARRAY);
        // texSubImage3D from a canvas can fail silently (e.g. a canvas the
        // browser considers tainted); treat any GL error as "no effect".
        const err = gl!.getError();
        if (err !== gl!.NO_ERROR) {
            gl!.deleteTexture(texture);
            throw new Error(`ParticleScroll: texture upload failed (${err})`);
        }

        if (contentTexture) gl!.deleteTexture(contentTexture);
        contentTexture = texture;
        snap = {
            width: snapshot.width,
            height: snapshot.height,
            tileH: tileHpx * (snapshot.height / height),
            layers,
        };
        // Free the CPU-side copy now that the GPU has it (Safari in
        // particular only releases canvas memory when it's shrunk to 0).
        src.width = src.height = 0;

        if (process.env.NODE_ENV !== "production") {
            // Rough GPU footprint: 4 bytes/pixel, +1/3 for the mipmap chain.
            const mb = (width * tileHpx * layers * 4 * (4 / 3)) / 2 ** 20;
            console.debug(
                `[particle-scroll] texture ${width}x${height}px, ${layers} layer(s) of ${tileHpx}px (max ${maxTextureSize}), ~${mb.toFixed(1)} MB`,
            );
        }
    }

    function onScroll() {
        start();
    }
    scroller.addEventListener("scroll", onScroll, { passive: true });

    const observer = new ResizeObserver(() => start());
    observer.observe(output);
    observer.observe(card);

    function onLost(event: Event) {
        event.preventDefault();
        onContextLost?.();
    }
    output.addEventListener("webglcontextlost", onLost);

    syncCanvasBox();

    return {
        maxTextureSize,
        setSnapshot(snapshot) {
            uploadSnapshot(snapshot);
            introReady = true;
            start();
        },
        setOptions(next) {
            if (
                !Object.entries(next).some(
                    ([key, value]) =>
                        config[key as keyof ParticleScrollOptions] !== value,
                )
            )
                return;
            Object.assign(config, next);
            start();
        },
        destroy() {
            destroyed = true;
            applyMask(null);
            cancelAnimationFrame(raf);
            scroller.removeEventListener("scroll", onScroll);
            output.removeEventListener("webglcontextlost", onLost);
            observer.disconnect();
            if (contentTexture) gl!.deleteTexture(contentTexture);
            gl!.deleteTexture(rowTex);
            gl!.deleteProgram(base.program);
            gl!.deleteProgram(points.program);
            gl!.deleteShader(base.vert);
            gl!.deleteShader(base.frag);
            gl!.deleteShader(points.vert);
            gl!.deleteShader(points.frag);
            gl!.deleteBuffer(quad);
            gl!.deleteVertexArray(quadVao);
            gl!.deleteVertexArray(pointVao);
        },
    };
}
