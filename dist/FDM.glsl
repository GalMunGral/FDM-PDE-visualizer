#version 300 es
precision mediump float;

uniform float N;
uniform float dt;
uniform float h;
uniform sampler2D UV;

in vec2 texCoord;
out vec4 fragColor;

void main() {

#define u(x, y) texture(UV, vec2(mod(x, N) / N, mod(y, N) / N)).x
#define v(x, y) texture(UV, vec2(mod(x, N) / N, mod(y, N) / N)).y

    float x = gl_FragCoord.x;
    float y = gl_FragCoord.y;

    float dudx = (u(x + 1.0, y) - u(x - 1.0, y)) / (2.0 * h);
    float dudy = (u(x, y + 1.0) - u(x, y - 1.0)) / (2.0 * h);
    float d2udx2 = (u(x - 1.0, y) - 2.0 * u(x, y) + u(x + 1.0, y)) / (h * h);
    float d2udy2 = (u(x, y - 1.0) - 2.0 * u(x, y) + u(x, y + 1.0)) / (h * h);

    float dudt = v(x, y);
    float dvdt = 100.0 * (d2udx2 + d2udy2); // wave equation

    fragColor.x = u(x, y) + dt * dudt;
    fragColor.y = v(x, y) + dt * dvdt;
}