/* global crypto */
'use strict';

const EXPECTED_HASH = 'bf9da7959d914298f9ce9e41a480fd66f76fac5c6f5e0a9b5a99b18cfc6fd997';

const els = {
  glCanvas: document.getElementById('glCanvas'),
  previewCanvas: document.getElementById('previewCanvas'),
  runBtn: document.getElementById('runBtn'),
  noiseToggle: document.getElementById('noiseToggle'),
  statusBadge: document.getElementById('statusBadge'),
  resultText: document.getElementById('resultText'),
  noiseText: document.getElementById('noiseText'),
  supportText: document.getElementById('supportText'),
  byteCount: document.getElementById('byteCount'),
  vendorText: document.getElementById('vendorText'),
  rendererText: document.getElementById('rendererText'),
  actualHash: document.getElementById('actualHash'),
  expectedHash: document.getElementById('expectedHash'),
  matchText: document.getElementById('matchText'),
  bytePreview: document.getElementById('bytePreview')
};

function setStatus(ok, text) {
  els.statusBadge.textContent = text;
  els.statusBadge.className = ok ? 'status ok' : 'status bad';
  els.resultText.textContent = text;
  els.resultText.className = ok ? 'v ok' : 'v bad';
}

async function sha256Hex(bufferLike) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bufferLike);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function drawRectangle(gl, canvas) {
  const indices = [3, 2, 1, 3, 1, 0];

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -0.75,  0.75, 0,
      -0.75, -0.75, 0,
       0.75, -0.75, 0,
       0.75,  0.75, 0,
    ]),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, 'attribute vec3 coordinates; void main(void) { gl_Position = vec4(coordinates, 1.0); }');
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, 'void main(void) { gl_FragColor = vec4(255.0, 0.0, 0.0, 1.0); }');
  gl.compileShader(fragmentShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  const coord = gl.getAttribLocation(program, 'coordinates');
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coord);

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  gl.finish();
}

function paintPreview(pixelBytes, width, height) {
  const ctx = els.previewCanvas.getContext('2d');
  const imageData = new ImageData(new Uint8ClampedArray(pixelBytes), width, height);
  ctx.putImageData(imageData, 0, 0);
}

async function runCheck() {
  const canvas = els.glCanvas;
  const noiseEnabled = els.noiseToggle.checked;
  els.noiseText.textContent = noiseEnabled ? '已开启' : '未开启';
  els.noiseText.className = noiseEnabled ? 'v warn' : 'v ok';

  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
    || canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });

  if (!gl) {
    els.supportText.textContent = '不支持';
    els.supportText.className = 'v bad';
    setStatus(false, '当前环境不支持 WebGL');
    return;
  }

  els.supportText.textContent = '支持';
  els.supportText.className = 'v ok';

  drawRectangle(gl, canvas);

  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
  const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  els.vendorText.textContent = vendor || '-';
  els.rendererText.textContent = renderer || '-';

  await new Promise(requestAnimationFrame);
  gl.finish();

  const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
  gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  if (noiseEnabled) {
    for (let i = 0; i < Math.min(48, pixels.length); i += 4) {
      pixels[i] = Math.max(0, pixels[i] - (i % 7));
      pixels[i + 1] = (pixels[i + 1] + 2) % 256;
      pixels[i + 2] = (pixels[i + 2] + 1) % 256;
    }
  }

  paintPreview(pixels, gl.drawingBufferWidth, gl.drawingBufferHeight);
  els.byteCount.textContent = String(pixels.length);
  els.bytePreview.textContent = Array.from(pixels.slice(0, 64)).join(', ');

  const actualHash = await sha256Hex(pixels);
  const matched = actualHash === EXPECTED_HASH;

  els.actualHash.textContent = actualHash;
  els.actualHash.className = matched ? 'v ok' : 'v bad';
  els.matchText.textContent = matched ? '匹配' : '不匹配';
  els.matchText.className = matched ? 'v ok' : 'v bad';

  if (matched) {
    setStatus(true, 'No masking detected');
  } else {
    setStatus(false, 'Masking detected');
  }
}

els.runBtn.addEventListener('click', runCheck);
els.noiseToggle.addEventListener('change', runCheck);
runCheck();
