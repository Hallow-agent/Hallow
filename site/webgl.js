(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvases = [...document.querySelectorAll('[data-webgl]')];
  if (reduced || !canvases.length) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * .5 + .5;
      gl_Position = vec4(a_position, 0., 1.);
    }
  `;
  const fragment = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform vec2 u_textureResolution;
    uniform vec2 u_pointer;
    uniform float u_time;
    uniform float u_scroll;
    uniform float u_variant;
    uniform float u_hero;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 cover(vec2 uv) {
      float canvasRatio = u_resolution.x / u_resolution.y;
      float textureRatio = u_textureResolution.x / u_textureResolution.y;
      vec2 scale = vec2(1.);
      if (canvasRatio > textureRatio) scale.y = textureRatio / canvasRatio;
      else scale.x = canvasRatio / textureRatio;
      return (uv - .5) * scale + .5;
    }

    void main() {
      vec2 uv = v_uv;
      float travel = smoothstep(.02, .96, u_scroll);
      float startZoom = mix(1.25, 1.55, u_hero);
      float cameraZoom = mix(startZoom, 1., travel);
      vec2 centered = uv - .5;
      float radius = dot(centered, centered);
      centered *= 1. + (1. - travel) * radius * .14;
      uv = centered / cameraZoom + .5;

      float edge = smoothstep(.9, .18, distance(v_uv, vec2(.5)));
      vec2 pointer = (u_pointer - .5) * mix(.045, .018, travel);
      float wave = sin(uv.y * 19. + u_time * .42) * .0025;
      wave += sin(uv.y * 61. - u_time * .18) * .0008;
      uv.x += wave * (1. + u_scroll * 2.) + pointer.x * (uv.y - .5);
      uv.y += pointer.y * (uv.x - .5);

      float transitionFx = sin(travel * 3.14159265);
      float blocks = mix(200., 100., transitionFx);
      vec2 blockUv = floor(uv * vec2(blocks, blocks * u_resolution.y / u_resolution.x)) /
                     vec2(blocks, blocks * u_resolution.y / u_resolution.x);
      float blockMix = .02 + .10 * transitionFx;
      uv = mix(uv, blockUv, blockMix);

      vec4 tex = texture2D(u_texture, cover(uv));
      float luma = dot(tex.rgb, vec3(.299, .587, .114));
      vec3 warm = vec3(luma * 1.08, luma * .98, luma * .82);
      tex.rgb = mix(tex.rgb, warm, .25 + .13 * u_variant);

      vec2 ditherCell = floor(gl_FragCoord.xy / mix(2., 4., transitionFx));
      float dither = hash(ditherCell) - .5;
      tex.rgb += dither * (.012 + .035 * transitionFx);
      float scan = sin(gl_FragCoord.y * .64 + u_time * 1.2) * .012;
      tex.rgb += scan * (.2 + u_scroll);
      tex.rgb *= mix(.68, 1., edge);
      tex.rgb *= .96 + hash(gl_FragCoord.xy + u_time) * .035;
      gl_FragColor = vec4(tex.rgb, 1.);
    }
  `;

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Hallow WebGL shader:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  class Scene {
    constructor(canvas, index) {
      this.canvas = canvas;
      this.index = index;
      this.active = false;
      this.loaded = false;
      this.scroll = 0;
      this.pointer = { x: .5, y: .5 };
      this.targetPointer = { x: .5, y: .5 };
      this.gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
      if (!this.gl) return;
      this.setup();
    }

    setup() {
      const gl = this.gl;
      const vs = compile(gl, gl.VERTEX_SHADER, vertex);
      const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
      if (!vs || !fs) return;
      this.program = gl.createProgram();
      gl.attachShader(this.program, vs);
      gl.attachShader(this.program, fs);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) return;
      gl.useProgram(this.program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(this.program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      this.uniforms = {
        texture: gl.getUniformLocation(this.program, 'u_texture'),
        resolution: gl.getUniformLocation(this.program, 'u_resolution'),
        textureResolution: gl.getUniformLocation(this.program, 'u_textureResolution'),
        pointer: gl.getUniformLocation(this.program, 'u_pointer'),
        time: gl.getUniformLocation(this.program, 'u_time'),
        scroll: gl.getUniformLocation(this.program, 'u_scroll'),
        variant: gl.getUniformLocation(this.program, 'u_variant'),
        hero: gl.getUniformLocation(this.program, 'u_hero')
      };
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform1i(this.uniforms.texture, 0);

      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        this.imageWidth = image.naturalWidth;
        this.imageHeight = image.naturalHeight;
        this.loaded = true;
        this.canvas.classList.add('webgl-ready');
        this.canvas.parentElement?.classList.add('has-webgl');
        this.resize();
      };
      image.src = this.canvas.dataset.webgl;
      this.image = image;
      new ResizeObserver(() => this.resize()).observe(this.canvas);
    }

    resize() {
      if (!this.gl) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(2, Math.round(rect.width * dpr));
      const height = Math.max(2, Math.round(rect.height * dpr));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
      }
    }

    updateScroll() {
      const rect = this.canvas.getBoundingClientRect();
      const total = innerHeight + rect.height;
      this.scroll = Math.max(0, Math.min(1, (innerHeight - rect.top) / total));
      if (this.canvas.dataset.scene === 'hero') {
        const hero = this.canvas.closest('.hero-scroll');
        const distance = Math.max(1, hero.offsetHeight - innerHeight);
        this.scroll = Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / distance));
      }
    }

    draw(time) {
      if (!this.gl || !this.loaded || !this.active) return;
      this.updateScroll();
      this.pointer.x += (this.targetPointer.x - this.pointer.x) * .045;
      this.pointer.y += (this.targetPointer.y - this.pointer.y) * .045;
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      gl.uniform2f(this.uniforms.textureResolution, this.imageWidth, this.imageHeight);
      gl.uniform2f(this.uniforms.pointer, this.pointer.x, this.pointer.y);
      gl.uniform1f(this.uniforms.time, time * .001);
      gl.uniform1f(this.uniforms.scroll, this.scroll);
      gl.uniform1f(this.uniforms.variant, this.index / Math.max(1, canvases.length - 1));
      gl.uniform1f(this.uniforms.hero, this.canvas.dataset.scene === 'hero' ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  const scenes = canvases.map((canvas, index) => new Scene(canvas, index)).filter(scene => scene.gl);
  if (!scenes.length) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  document.documentElement.classList.add('has-webgl-support');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const scene = scenes.find(item => item.canvas === entry.target);
      if (scene) scene.active = entry.isIntersecting;
    });
  }, { rootMargin: '30% 0px 30% 0px' });
  scenes.forEach(scene => observer.observe(scene.canvas));

  addEventListener('pointermove', event => {
    scenes.forEach(scene => {
      const rect = scene.canvas.getBoundingClientRect();
      scene.targetPointer.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
      scene.targetPointer.y = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / Math.max(1, rect.height)));
    });
  }, { passive: true });

  const frame = time => {
    scenes.forEach(scene => scene.draw(time));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  window.HallowScenes = scenes;
})();
