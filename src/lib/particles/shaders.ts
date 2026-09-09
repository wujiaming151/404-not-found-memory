export const vertexShader = `
attribute vec3 sourceColor;
attribute float phase;
uniform float time;
uniform float mode;
uniform float amplitude;
uniform float depth;
uniform float cohesion;
uniform float radius;
uniform float intensity;
uniform float pointScale;
uniform float reduced;
uniform vec3 pointer;
uniform vec3 pulse;
uniform float clock;
uniform float energy;
uniform float ambientField;
varying vec3 vColor;
varying float vAlpha;
varying float vAngle;
void main() {
  float cycle = .5 - .5 * cos(time * 1.4);
  float intro = smoothstep(.1, 1.3, time);
  float spread = intro * mix(.24 + .76 * cycle, cycle, smoothstep(2., 3., mode));
  spread *= energy;
  spread *= 1. - reduced * .94;
  vec3 p = position;
  p.xy *= 1. + spread * .2;
  float wave = sin(p.x * 3.5 + time + phase * .12);
  vec3 drift = vec3(sin(time + phase), cos(time * .72 + phase * 1.3), sin(phase * 2. + time * .65));
  p += drift * amplitude * spread * vec3(.65, .5, .4);
  p.z += (sin(phase * 3.7) * depth * 1.5 + wave * .22) * spread;
  float waveWeight = max(0., 1. - abs(mode - 1.));
  float vortexWeight = max(0., 1. - abs(mode - 2.));
  p.y += wave * .4 * spread * waveWeight;
  p.z += cos(position.y * 4. + time) * .45 * spread * waveWeight;
  {
    float angle = spread * (.7 + length(position.xy) * .6) * sin(time * .4) * vortexWeight;
    p.xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p.xy;
    p.z += sin(length(position.xy) * 4. - time) * .45 * spread * vortexWeight;
  }
  p.xy = mix(p.xy, position.xy, cohesion * (1. - spread) * .25);
  float ambient = step(6.06, phase) * ambientField;
  p.xy += vec2(sin(phase * 14. + time * .1), cos(phase * 11. + time * .08)) * ambient;
  p.z += ambient * sin(phase * 7.) * .9;
  vec2 diff = p.xy - pointer.xy;
  float force = exp(-dot(diff, diff) / (radius * radius)) * pointer.z * (1. - reduced);
  p.xy += normalize(diff + vec2(.001)) * force * .22;
  p.z += force * .3;
  float age = max(0., clock - pulse.z);
  float distanceToPulse = length(p.xy - pulse.xy);
  float ripple = exp(-pow((distanceToPulse - age * 1.1) * 5., 2.)) * exp(-age * .8) * (1. - reduced);
  p.z += ripple * .6;
  p.xy += normalize(p.xy - pulse.xy + .001) * ripple * .16;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(pointScale * (1.2 + .45 * sin(phase)) / -mv.z, 1., 12.);
  vColor = sourceColor;
  vAlpha = (.7 + .3 * smoothstep(0., .7, time)) * intensity * (1. - ambient * .55);
  vAngle = phase + time * .1;
}`;
export const fragmentShader = `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
varying float vAngle;
uniform float saturation;
uniform float glow;
uniform float brightness;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  vec2 q = (gl_PointCoord - .5) * 2.;
  q = mat2(cos(vAngle), -sin(vAngle), sin(vAngle), cos(vAngle)) * q;
  float triangle = max(max(.866 * q.x + .5 * q.y, -.866 * q.x + .5 * q.y), -q.y) - .36;
  float outline = 1. - smoothstep(.025, .14, abs(triangle));
  float fill = 1. - smoothstep(-.04, .06, triangle);
  float core = mix(fill, outline, .6);
  float halo = exp(-d * d * 5.) * glow * .25;
  float luminance = dot(vColor, vec3(.2126, .7152, .0722));
  vec3 color = mix(vec3(luminance), vColor, .9 + saturation * .1);
  // Preserve hue while making ink on a dark stage visible; black receives a neutral rim.
  color = mix(color, max(color, vec3(.035)) * 2., 1. - smoothstep(.25, .55, brightness));
  gl_FragColor = vec4(color, (core + halo) * vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
