import * as THREE from "three";

const VERTEX_SHADER = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime, uAttenuation, uLineThickness;
uniform float uBaseRadius, uRadiusStep, uScaleRate;
uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
uniform float uFadeIn, uFadeOut;
uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
uniform vec2 uResolution, uMouse;
uniform vec3 uColor, uColorTwo;
uniform int uRingCount;

const float HP = 1.5707963;
const float CYCLE = 3.45;

float fade(float t) {
  return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);
}

float ring(vec2 p, float ri, float cut, float t0, float px) {
  float t = mod(uTime + t0, CYCLE);
  float r = ri + t / CYCLE * uScaleRate;
  float d = abs(length(p) - r);
  float a = atan(abs(p.y), abs(p.x)) / HP;
  float th = max(1.0 - a, 0.5) * px * uLineThickness;
  float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;
  d += pow(cut * a, 3.0) * r;
  return h * exp(-uAttenuation * d) * fade(t);
}

void main() {
  float px = 1.0 / min(uResolution.x, uResolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;
  float cr = cos(uRotation), sr = sin(uRotation);
  p = mat2(cr, -sr, sr, cr) * p;
  p -= uMouse * uMouseInfluence;
  float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
  p /= sc;
  vec3 c = vec3(0.0);
  float rcf = max(float(uRingCount) - 1.0, 1.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);
    vec2 pr = p - fi * uParallax * uMouse;
    vec3 rc = mix(uColor, uColorTwo, fi / rcf);
    c = mix(c, rc, vec3(ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px)));
  }
  c *= 1.0 + uBurst * 2.0;
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uNoiseAmount;
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)) * uOpacity);
}
`;

const DEFAULTS = {
  color: "#A855F7",
  colorTwo: "#6366F1",
  speed: 1,
  ringCount: 6,
  attenuation: 10,
  lineThickness: 2,
  baseRadius: 0.35,
  radiusStep: 0.1,
  scaleRate: 0.1,
  opacity: 1,
  blur: 0,
  noiseAmount: 0.1,
  rotation: 0,
  ringGap: 1.5,
  fadeIn: 0.7,
  fadeOut: 0.5,
  followMouse: false,
  mouseInfluence: 0.2,
  hoverScale: 1.2,
  parallax: 0.05,
  clickBurst: false,
};

function readOptions(el) {
  const opts = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    const attr = el.dataset[key.replace(/([A-Z])/g, "-$1").toLowerCase()];
    if (attr === undefined) continue;
    if (typeof DEFAULTS[key] === "boolean") opts[key] = attr === "true";
    else if (typeof DEFAULTS[key] === "number") opts[key] = parseFloat(attr);
    else opts[key] = attr;
  }
  return opts;
}

export function initMagicRings(mount, userOptions = {}) {
  if (!mount) return null;

  let props = { ...DEFAULTS, ...readOptions(mount), ...userOptions };
  const mouse = [0, 0];
  const smoothMouse = [0, 0];
  let hoverAmount = 0;
  let isHovered = false;
  let burst = 0;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return null;
  }

  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    mount.classList.add("magic-rings-container--fallback");
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  mount.classList.add("magic-rings-container--ready");

  if (props.blur > 0) {
    mount.style.filter = `blur(${props.blur}px)`;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.z = 1;

  const uniforms = {
    uTime: { value: 0 },
    uAttenuation: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uColor: { value: new THREE.Color() },
    uColorTwo: { value: new THREE.Color() },
    uLineThickness: { value: 0 },
    uBaseRadius: { value: 0 },
    uRadiusStep: { value: 0 },
    uScaleRate: { value: 0 },
    uRingCount: { value: 0 },
    uOpacity: { value: 1 },
    uNoiseAmount: { value: 0 },
    uRotation: { value: 0 },
    uRingGap: { value: 1.6 },
    uFadeIn: { value: 0.5 },
    uFadeOut: { value: 0.75 },
    uMouse: { value: new THREE.Vector2() },
    uMouseInfluence: { value: 0 },
    uHoverAmount: { value: 0 },
    uHoverScale: { value: 1 },
    uParallax: { value: 0 },
    uBurst: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    transparent: true,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material));

  const resize = () => {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr);
    uniforms.uResolution.value.set(w * dpr, h * dpr);
  };

  resize();
  window.addEventListener("resize", resize);
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  const onMouseMove = (e) => {
    const rect = mount.getBoundingClientRect();
    mouse[0] = (e.clientX - rect.left) / rect.width - 0.5;
    mouse[1] = -((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onEnter = () => { isHovered = true; };
  const onLeave = () => {
    isHovered = false;
    mouse[0] = 0;
    mouse[1] = 0;
  };
  const onClick = () => { burst = 1; };

  mount.addEventListener("mousemove", onMouseMove);
  mount.addEventListener("mouseenter", onEnter);
  mount.addEventListener("mouseleave", onLeave);
  mount.addEventListener("click", onClick);

  let frameId = 0;
  let visible = true;

  const animate = (t) => {
    frameId = requestAnimationFrame(animate);
    if (!visible) return;

    props = { ...props, ...readOptions(mount), ...userOptions };

    smoothMouse[0] += (mouse[0] - smoothMouse[0]) * 0.08;
    smoothMouse[1] += (mouse[1] - smoothMouse[1]) * 0.08;
    hoverAmount += ((isHovered ? 1 : 0) - hoverAmount) * 0.08;
    burst *= 0.95;
    if (burst < 0.001) burst = 0;

    uniforms.uTime.value = t * 0.001 * props.speed;
    uniforms.uAttenuation.value = props.attenuation;
    uniforms.uColor.value.set(props.color);
    uniforms.uColorTwo.value.set(props.colorTwo);
    uniforms.uLineThickness.value = props.lineThickness;
    uniforms.uBaseRadius.value = props.baseRadius;
    uniforms.uRadiusStep.value = props.radiusStep;
    uniforms.uScaleRate.value = props.scaleRate;
    uniforms.uRingCount.value = props.ringCount;
    uniforms.uOpacity.value = props.opacity;
    uniforms.uNoiseAmount.value = props.noiseAmount;
    uniforms.uRotation.value = (props.rotation * Math.PI) / 180;
    uniforms.uRingGap.value = props.ringGap;
    uniforms.uFadeIn.value = props.fadeIn;
    uniforms.uFadeOut.value = props.fadeOut;
    uniforms.uMouse.value.set(smoothMouse[0], smoothMouse[1]);
    uniforms.uMouseInfluence.value = props.followMouse ? props.mouseInfluence : 0;
    uniforms.uHoverAmount.value = hoverAmount;
    uniforms.uHoverScale.value = props.hoverScale;
    uniforms.uParallax.value = props.parallax;
    uniforms.uBurst.value = props.clickBurst ? burst : 0;

    renderer.render(scene, camera);
  };

  frameId = requestAnimationFrame(animate);

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    },
    { threshold: 0.05 }
  );
  io.observe(mount);

  return () => {
    cancelAnimationFrame(frameId);
    io.disconnect();
    window.removeEventListener("resize", resize);
    ro.disconnect();
    mount.removeEventListener("mousemove", onMouseMove);
    mount.removeEventListener("mouseenter", onEnter);
    mount.removeEventListener("mouseleave", onLeave);
    mount.removeEventListener("click", onClick);
    if (renderer.domElement.parentNode === mount) {
      mount.removeChild(renderer.domElement);
    }
    renderer.dispose();
    material.dispose();
  };
}

document.querySelectorAll("[data-magic-rings]").forEach((el) => {
  initMagicRings(el);
});
