precision mediump float;

uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUV;

void main() {
	gl_FragColor = ( texture2D( baseTexture, vUV ) + vec4( 1.0 ) * texture2D( bloomTexture, vUV ) );
}