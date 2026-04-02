/* ============================================================
   工具函数
   ============================================================ */
const $ = id => document.getElementById(id);

function log(msg, type = 'info') {
  const panel = $('logPanel');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  line.textContent = `[${ts}] ${msg}`;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;
}

function setResult(id, value, type = 'info') {
  const el = $(id);
  if (!el) return;
  el.textContent = value;
  el.className = 'result-value ' + type;
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/* ============================================================
   1. Canvas 能力检测
   ============================================================ */
function test_canvasAPI() {
  log('── 1.1 检测 Canvas 2D API ...', 'info');
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const hasCanvas = !!(canvas && ctx);
  setResult('res-canvas2d', hasCanvas ? '✓ 支持 (canvas && getContext("2d") 均不为 null)' : '✗ 不支持', hasCanvas ? 'pass' : 'fail');
  log(`Canvas 2D API: ${hasCanvas ? '支持' : '不支持'}`, hasCanvas ? 'ok' : 'err');
  $('sum-api').textContent = hasCanvas ? '✓ 支持' : '✗ 不';
  $('sum-api').style.color = hasCanvas ? '#4affbd' : '#ff5d27';
  return { canvas, ctx, hasCanvas };
}

function test_textAPI(ctx) {
  log('── 1.2 检测 Canvas Text API ...', 'info');
  const hasText = !!(ctx && typeof ctx.fillText === 'function');
  setResult('res-textapi', hasText ? '✓ ctx.fillText 为 function 类型' : '✗ fillText 不可用', hasText ? 'pass' : 'fail');
  log(`Text API: ${hasText ? '支持' : '不支持'}`, hasText ? 'ok' : 'err');
}

function test_toDataURL(canvas, ctx) {
  log('── 1.3 检测 toDataURL ...', 'info');
  const result = !!(ctx && canvas.toDataURL) && canvas.toDataURL().indexOf('data:image/png;base6') !== -1;
  const prefix = canvas.toDataURL ? canvas.toDataURL().substring(0, 30) : 'N/A';
  setResult('res-todataurl', result ? '✓ 返回有效 PNG base64 数据' : '✗ 返回无效数据（可能被拦截）', result ? 'pass' : 'fail');
  setResult('res-todataurl-prefix', prefix, 'info');
  log(`toDataURL: ${result ? '有效' : '无效'} | 前缀: ${prefix}`, result ? 'ok' : 'err');
}

function test_offscreenCanvas() {
  log('── 1.4 检测 OffscreenCanvas API ...', 'info');
  try {
    const oc = new OffscreenCanvas(1, 1);
    const octx = oc.getContext('2d');
    const hasOC = !!(oc && octx);
    const hasBlob = typeof oc.convertToBlob === 'function';
    setResult('res-offscreen', hasOC ? '✓ OffscreenCanvas 可用' : '✗ 不支持', hasOC ? 'pass' : 'fail');
    setResult('res-offscreen-blob', hasBlob ? '✓ convertToBlob 方法存在' : '✗ convertToBlob 不存在', hasBlob ? 'pass' : 'warn');
    log(`OffscreenCanvas: ${hasOC ? '支持' : '不支持'} | convertToBlob: ${hasBlob ? '存在' : '不存在'}`, hasOC ? 'ok' : 'warn');
    $('sum-offscreen').textContent = hasOC ? '✓ 支持' : '✗ 不';
    $('sum-offscreen').style.color = hasOC ? '#4affbd' : '#ffb84a';
    return hasOC;
  } catch (e) {
    setResult('res-offscreen', `✗ 异常: ${e.message}`, 'fail');
    setResult('res-offscreen-blob', '✗ N/A', 'fail');
    log(`OffscreenCanvas 异常: ${e.message}`, 'err');
    $('sum-offscreen').textContent = '✗ 不';
    $('sum-offscreen').style.color = '#ff5d27';
    return false;
  }
}

/* ============================================================
   2. isNative 检测
   ============================================================ */
function test_isNative() {
  log('── 2.1 检测 toDataURL isNative ...', 'info');
  const canvas = document.createElement('canvas');
  const str = canvas.toDataURL.toString();
  const isNative = /native/i.test(str);
  setResult('res-native-str', str, 'info');
  setResult('res-native', isNative ? '✓ 包含 "native" → 原生实现（未被替换）' : '⚠ 不含 "native" → 可能被 JS 插件覆盖！', isNative ? 'pass' : 'warn');
  log(`toDataURL.toString(): "${str.substring(0, 60)}..."`, 'info');
  log(`isNative: ${isNative ? '是（原生）' : '否（疑似被覆盖）'}`, isNative ? 'ok' : 'warn');
  $('sum-native').textContent = isNative ? '✓ 原生' : '⚠ 覆盖?';
  $('sum-native').style.color = isNative ? '#4affbd' : '#ffb84a';
}

/* ============================================================
   3. 标准测试图绘制
   ============================================================ */
async function drawStandardImage(canvas, ctx) {
  canvas.width = 240;
  canvas.height = 60;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f60';
  ctx.fillRect(100, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.font = '18pt "Times New Roman"';
  const text = 'Cwm fjordbank gly ' + String.fromCharCode(55357, 56835); // 🐝
  ctx.fillText(text, 2, 15);
  await nextFrame();
  ctx.fillStyle = 'rgba(102, 204, 0, 0.2)';
  ctx.font = '18pt Arial';
  ctx.fillText(text, 4, 45);
  return text;
}

function drawGeometry(canvas, ctx) {
  canvas.width = 122;
  canvas.height = 110;
  ctx.globalCompositeOperation = 'multiply';
  for (const [color, cx, cy] of [['#f2f', 40, 40], ['#2ff', 80, 40], ['#ff2', 60, 80]]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#f9c';
  ctx.beginPath();
  ctx.arc(60, 60, 60, 0, Math.PI * 2, true);
  ctx.arc(60, 60, 20, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.globalCompositeOperation = 'source-over';
}

function test_isPointInPath(ctx) {
  log('── 3.2 检测 isPointInPath (evenodd) ...', 'info');
  const testCtx = document.createElement('canvas').getContext('2d');
  testCtx.rect(0, 0, 10, 10);
  testCtx.arc(2, 2, 6, 6, true);
  const rawResult = testCtx.isPointInPath(5, 5, 'evenodd');
  // 原始代码是 !isPointInPath(...) 作为 winding 标记
  const winding = !rawResult;
  setResult('res-winding', winding
    ? '✓ isPointInPath 正常识别 evenodd 规则'
    : '⚠ isPointInPath 对 evenodd 判断与预期不符',
    winding ? 'pass' : 'warn');
  setResult('res-winding-raw', `isPointInPath(5,5,"evenodd") = ${rawResult}，winding标记 = ${winding}`, 'info');
  log(`isPointInPath(5,5,"evenodd") = ${rawResult}`, 'info');
}

/* ============================================================
   4. 指纹提取 + PNG 解析
   ============================================================ */
function parsePNG(base64DataURL) {
  const b64 = base64DataURL.split(',')[1];
  if (!b64) return [];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // PNG 签名: 8 bytes
  const chunks = [];
  let offset = 8;
  while (offset < bytes.length) {
    // 4 bytes length
    const length = (bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3];
    offset += 4;
    // 4 bytes type
    let type = '';
    for (let i = 0; i < 4; i++) type += String.fromCharCode(bytes[offset + i]);
    offset += 4;
    // data
    const data = bytes.slice(offset, offset + length);
    offset += length;
    // 4 bytes CRC
    const crc = ((bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3]) >>> 0;
    offset += 4;
    chunks.push({ name: type, length, crc, data });
  }
  return chunks;
}

function chunkDesc(name) {
  const map = {
    IHDR: 'Image Header — 宽高/位深/颜色类型/压缩/过滤/交错',
    IDAT: 'Image Data — 实际像素数据（压缩）',
    IEND: 'Image End — 标志文件结束',
    sRGB: 'sRGB 颜色空间渲染意图',
    gAMA: 'Gamma 校正值',
    cHRM: 'CIE 色度坐标',
    pHYs: '像素物理尺寸',
    tEXt: '文本元数据',
    iTXt: '国际化文本元数据',
    bKGD: '背景颜色',
    tIME: '最后修改时间',
  };
  return map[name] || name;
}

function parseIHDR(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    width: view.getUint32(0),
    height: view.getUint32(4),
    depth: data[8],
    colorType: data[9],
    compression: data[10],
    filter: data[11],
    interlace: data[12],
  };
}

const colorTypeNames = {
  0: 'Grayscale (0)',
  2: 'RGB (2)',
  3: 'Indexed (3)',
  4: 'Grayscale+Alpha (4)',
  6: 'RGBA (6)',
};

function colorCount(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = new Uint32Array(imageData.data.buffer);
  const colorMap = {};
  let count = 0;
  for (let i = 0; i < pixels.length; i++) {
    const c = String(16777215 & pixels[i]); // RGB only, ignore alpha
    if (!colorMap[c]) { count++; colorMap[c] = 0; }
    colorMap[c]++;
  }
  return count;
}

async function test_fingerprintExtract() {
  log('── 3.1 & 3.3 绘制标准测试图 & 指纹提取 ...', 'info');

  const canvasA = $('standardCanvas');
  const ctxA = canvasA.getContext('2d');
  const text = await drawStandardImage(canvasA, ctxA);

  setResult('res-text-content', `"${text}"（含 Emoji U+1F41D）`, 'info');
  setResult('res-draw-params', '240×60 | Times New Roman 18pt + Arial 18pt | #f60矩形 + #069文字 + rgba(102,204,0,0.2)叠加', 'info');

  const canvasG = $('geometryCanvas');
  const ctxG = canvasG.getContext('2d');
  drawGeometry(canvasG, ctxG);
  log('几何图（圆形 multiply 混合）绘制完成', 'ok');

  // fingerprint
  const fp = canvasA.toDataURL();
  const geoFp = canvasG.toDataURL();
  setResult('res-fp-len', `${fp.length} 字符`, 'info');
  setResult('res-fp-preview', fp.substring(0, 100) + '...', 'info');
  setResult('res-geo-fp', geoFp.substring(0, 100) + '...', 'info');

  // color count
  const cc = colorCount(ctxA, 240, 30); // 只统计上半部
  setResult('res-colorcount', `${cc} 种颜色`, 'info');

  // PNG size
  const b64 = fp.split(',')[1];
  const pngBytes = atob(b64).length;
  setResult('res-filesize', `${pngBytes} bytes`, 'info');
  $('sum-filesize').textContent = `${pngBytes} B`;
  $('sum-filesize').style.color = '#7ab8ff';

  log(`Canvas 指纹提取完成 | 长度: ${fp.length} | 颜色数: ${cc} | PNG: ${pngBytes}B`, 'ok');

  return { fp, canvasA, ctxA };
}

function test_pngParsing(fp) {
  log('── 4.1 解析 PNG 数据块 ...', 'info');
  const chunks = parsePNG(fp);
  const tbody = $('png-chunks-body');
  tbody.innerHTML = '';

  for (const chunk of chunks) {
    const tr = document.createElement('tr');
    const crcHex = '0x' + chunk.crc.toString(16).toUpperCase().padStart(8, '0');
    tr.innerHTML = `
      <td style="color:#4affbd; font-weight:bold;">${chunk.name}</td>
      <td>${chunk.length}</td>
      <td style="color:#ffb84a;">${crcHex}</td>
      <td style="color:#aaa;">${chunkDesc(chunk.name)}</td>
    `;
    tbody.appendChild(tr);
  }

  // IHDR
  const ihdr = chunks.find(c => c.name === 'IHDR');
  if (ihdr) {
    const info = parseIHDR(ihdr.data);
    setResult('res-ihdr-size', `${info.width} × ${info.height} px`, 'info');
    setResult('res-ihdr-depth', `位深: ${info.depth}bit | 颜色类型: ${colorTypeNames[info.colorType] || info.colorType} | 压缩: ${info.compression} | 过滤: ${info.filter} | 交错: ${info.interlace}`, 'info');
    log(`IHDR: ${info.width}×${info.height}, 位深${info.depth}bit, 颜色类型${info.colorType}`, 'ok');
  }

  // sRGB
  const srgb = chunks.find(c => c.name === 'sRGB');
  if (srgb) {
    const intents = ['Perceptual（感知）', 'Relative colorimetric（相对色度）', 'Saturation（饱和度）', 'Absolute colorimetric（绝对色度）'];
    const intent = srgb.data[0];
    setResult('res-srgb', intent >= 0 && intent <= 3 ? intents[intent] : `未知(${intent})`, 'info');
    log(`sRGB 渲染意图: ${intent}`, 'ok');
  } else {
    setResult('res-srgb', '无 sRGB 数据块', 'warn');
  }

  // gAMA
  const gama = chunks.find(c => c.name === 'gAMA');
  if (gama) {
    const gammaRaw = (gama.data[0] << 24 | gama.data[1] << 16 | gama.data[2] << 8 | gama.data[3]) >>> 0;
    const gamma = gammaRaw / 100000;
    setResult('res-gamma', `${gamma.toFixed(5)} (raw: ${gammaRaw})`, 'info');
    log(`Gamma: ${gamma.toFixed(5)}`, 'ok');
  } else {
    setResult('res-gamma', '无 gAMA 数据块', 'warn');
  }

  log(`PNG 共 ${chunks.length} 个数据块: ${chunks.map(c => c.name).join(', ')}`, 'ok');
}

/* ============================================================
   5. 一致性检测
   ============================================================ */
async function test_n0() {
  log('── 5.1 toDataURL 篡改检测（n0）...', 'info');

  // Canvas A: 有内容
  const cA = $('tampCanvasA');
  const ctxA = cA.getContext('2d');
  await drawStandardImage(cA, ctxA);
  const fpA = cA.toDataURL();

  // Canvas B: 空白
  const cB = $('tampCanvasB');
  const ctxB = cB.getContext('2d');
  cB.width = 240; cB.height = 60;
  ctxB.fillStyle = '#fff';
  ctxB.fillRect(0, 0, 240, 60);
  const fpB = cB.toDataURL();

  const same = fpA === fpB;
  setResult('res-n0-a', `${fpA.length} 字符`, 'info');
  setResult('res-n0-b', `${fpB.length} 字符`, 'info');
  setResult('res-n0',
    same ? '⚠ 相同 → toDataURL 疑似被劫持！' : '✓ 不同 → toDataURL 返回真实内容（正常）',
    same ? 'warn' : 'pass');

  log(`n0: fpA.length=${fpA.length}, fpB.length=${fpB.length}, 相同=${same}`, same ? 'warn' : 'ok');
  $('sum-n0').textContent = same ? '⚠ 疑似篡改' : '✓ 正常';
  $('sum-n0').style.color = same ? '#ffb84a' : '#4affbd';
}

async function test_a0() {
  log('── 5.2 drawImage 像素对比（a0）...', 'info');

  const cA = $('a0CanvasA');
  const ctxA = cA.getContext('2d');
  await drawStandardImage(cA, ctxA);

  const fpA = cA.toDataURL();
  const w = cA.width, h = cA.height;

  const cB = $('a0CanvasB');
  cB.width = w; cB.height = h;
  const ctxB = cB.getContext('2d');

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctxB.drawImage(img, 0, 0);
      const dataA = ctxA.getImageData(0, 0, w, h);
      const dataB = ctxB.getImageData(0, 0, w, h);
      let diffCount = 0;
      for (let i = 0; i < dataA.data.length; i++) {
        if (dataA.data[i] !== dataB.data[i]) diffCount++;
      }
      const same = diffCount === 0;
      setResult('res-a0-pixelcount', `${dataA.data.length} 个分量（${w * h} 像素 × 4 RGBA）`, 'info');
      setResult('res-a0-diff', `${diffCount} 个分量（${(diffCount / 4).toFixed(0)} 像素）不同`, diffCount === 0 ? 'pass' : 'warn');
      setResult('res-a0', same ? '✓ 完全一致（正常）' : `⚠ 存在 ${diffCount} 个差异分量 → 可能被篡改`, same ? 'pass' : 'warn');
      log(`a0: 像素差异=${diffCount}分量（${(diffCount/4).toFixed(0)}像素），一致=${same}`, same ? 'ok' : 'warn');
      $('sum-a0').textContent = same ? '✓ 一致' : `⚠ ${diffCount}差异`;
      $('sum-a0').style.color = same ? '#4affbd' : '#ffb84a';
      resolve();
    };
    img.src = fpA;
  });
}

async function test_x0() {
  log('── 5.3 OffscreenCanvas 一致性检测（x0）...', 'info');
  try {
    if (!window.OffscreenCanvas || !window.FileReader) {
      setResult('res-x0', '⚠ OffscreenCanvas 或 FileReader 不可用，跳过', 'warn');
      $('sum-x0').textContent = 'N/A'; $('sum-x0').style.color = '#ffb84a';
      return;
    }

    // 主线程 canvas
    const mainCanvas = document.createElement('canvas');
    const mainCtx = mainCanvas.getContext('2d');
    await drawStandardImage(mainCanvas, mainCtx);
    const mainDataURL = mainCanvas.toDataURL();

    // OffscreenCanvas
    const oc = new OffscreenCanvas(240, 60);
    const octx = oc.getContext('2d');
    await drawStandardImage(oc, octx);

    const offDataURL = await new Promise((res) => {
      oc.convertToBlob().then(blob => {
        const reader = new FileReader();
        reader.onload = (e) => res(e.target.result);
        reader.readAsDataURL(blob);
      });
    });

    const same = mainDataURL === offDataURL;
    setResult('res-x0-main', `${mainDataURL.length} 字符`, 'info');
    setResult('res-x0-off', `${offDataURL.length} 字符`, 'info');
    setResult('res-x0',
      same ? '✓ 一致（正常）' : '⚠ 不一致 → 沙箱隔离或渲染差异',
      same ? 'pass' : 'warn');
    log(`x0: main=${mainDataURL.length}, offscreen=${offDataURL.length}, 一致=${same}`, same ? 'ok' : 'warn');
    $('sum-x0').textContent = same ? '✓ 一致' : '⚠ 不一致';
    $('sum-x0').style.color = same ? '#4affbd' : '#ffb84a';
  } catch (e) {
    setResult('res-x0', `✗ 异常: ${e.message}`, 'fail');
    log(`x0 异常: ${e.message}`, 'err');
    $('sum-x0').textContent = '✗ 异常'; $('sum-x0').style.color = '#ff5d27';
  }
}

/* ============================================================
   6. Canvas 噪声像素检测 (o0)
   ============================================================ */
async function test_o0() {
  log('── 6.1 Canvas 像素噪声检测（o0）...', 'info');

  // 检测是否 Blink
  const isBlink = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor || '');
  setResult('res-o0-blink', isBlink ? '✓ 是 Blink 引擎（检测有效）' : '⚠ 非 Blink 引擎（结果仅供参考）', isBlink ? 'pass' : 'warn');
  log(`Blink 引擎: ${isBlink}`, isBlink ? 'ok' : 'warn');

  const cA = $('noiseCanvasA');
  const ctxA = cA.getContext('2d');
  // 已在 HTML 中设置尺寸
  cA.width = 21; cA.height = 120;

  // 绘制标准噪声测试图
  ctxA.fillStyle = '#66666666';
  ctxA.fillRect(0, 0, 21, 120);
  ctxA.font = '18pt "Arial"';
  ctxA.fillText('H', 6, 14);

  const fp = cA.toDataURL();
  log('噪声测试图绘制完成，开始 drawImage 回写...', 'info');

  const cB = $('noiseCanvasB');
  cB.width = 21; cB.height = 120;
  const ctxB = cB.getContext('2d');

  await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctxB.drawImage(img, 0, 0);

      const dataA = ctxA.getImageData(0, 0, 21, 120);
      const dataB = ctxB.getImageData(0, 0, 21, 120);

      // 已知边框扰动像素索引（像素索引，非字节索引）
      const BORDER_PIXELS = new Set([
        131,132,133,134,135,136,137,138,139,140,
        153,154,155,158,159,
        174,175,176,179,180,
        195,196,197,198,199,200,201,
        216,217,218,221,222,
        237,238,239,242,243,
        258,259,260,263,264,
        278,279,280,281,282,283,284,285,286,287,
        156,157,160,219,220,
      ]);

      const diffPixels = [];
      const diffAmounts = [];
      const centerDiffPixels = [];
      const centerDiffValues = [];

      for (let px = 0; px < 21 * 120; px++) {
        const i = px * 4;
        const isDiff = dataA.data[i] !== dataB.data[i] ||
                       dataA.data[i+1] !== dataB.data[i+1] ||
                       dataA.data[i+2] !== dataB.data[i+2] ||
                       dataA.data[i+3] !== dataB.data[i+3];
        if (isDiff) {
          diffPixels.push(px);
          diffAmounts.push(dataB.data[i] - dataA.data[i]);
          if (!BORDER_PIXELS.has(px)) {
            centerDiffPixels.push(px);
            centerDiffValues.push([dataA.data[i], dataA.data[i+1], dataA.data[i+2], dataA.data[i+3]]);
          }
        }
      }

      // 可视化差异
      const cDiff = $('noiseDiffCanvas');
      cDiff.width = 21; cDiff.height = 120;
      const ctxDiff = cDiff.getContext('2d');
      const diffData = ctxDiff.createImageData(21, 120);
      const domData = dataA;
      for (let px = 0; px < 21 * 120; px++) {
        const i = px * 4;
        const isDiff = diffPixels.includes(px);
        const isBorder = BORDER_PIXELS.has(px);
        const isCenterDiff = centerDiffPixels.includes(px);
        if (isCenterDiff) {
          // 红色：中心区域差异 (噪声)
          diffData.data[i] = 255; diffData.data[i+1] = 0; diffData.data[i+2] = 0; diffData.data[i+3] = 255;
        } else if (isBorder && isDiff) {
          // 绿色：已知边框差异（排除）
          diffData.data[i] = 0; diffData.data[i+1] = 200; diffData.data[i+2] = 0; diffData.data[i+3] = 255;
        } else {
          // 蓝/灰色：一致区域
          diffData.data[i] = domData.data[i] / 4;
          diffData.data[i+1] = domData.data[i+1] / 4;
          diffData.data[i+2] = domData.data[i+2] / 4 + 60;
          diffData.data[i+3] = 255;
        }
      }
      ctxDiff.putImageData(diffData, 0, 0);

      const totalDiff = diffPixels.length;
      const centerDiff = centerDiffPixels.length;
      const hasNoise = centerDiff > 0;

      setResult('res-o0-total-diff', `${totalDiff} 像素`, 'info');
      setResult('res-o0-center-diff', `${centerDiff} 像素（排除 ${BORDER_PIXELS.size} 个边框像素后）`, centerDiff > 0 ? 'warn' : 'pass');
      setResult('res-o0-values',
        centerDiffValues.length > 0
          ? centerDiffValues.slice(0, 5).map(v => `(${v.join(',')})`).join(' ') + (centerDiffValues.length > 5 ? '...' : '')
          : '无差异',
        centerDiff > 0 ? 'warn' : 'pass');
      setResult('res-o0-verdict',
        hasNoise ? `⚠ 检测到 ${centerDiff} 个噪声像素 → 疑似插件注入噪声！` : '✓ 未检测到中心区域像素差异（正常）',
        hasNoise ? 'warn' : 'pass');

      log(`o0 噪声检测: 总差异=${totalDiff}px, 中心差异=${centerDiff}px, 疑似噪声=${hasNoise}`, hasNoise ? 'warn' : 'ok');
      $('sum-o0').textContent = hasNoise ? `⚠ ${centerDiff}px噪声` : '✓ 无噪声';
      $('sum-o0').style.color = hasNoise ? '#ffb84a' : '#4affbd';
      resolve();
    };
    img.src = fp;
  });
}

/* ============================================================
   主测试流程
   ============================================================ */
async function runAllTests() {
  const btn = $('runBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 检测中...';
  $('logPanel').innerHTML = '';

  log('======== Canvas 指纹检测开始 ========', 'info');

  try {
    // 1. API 能力检测
    const { canvas, ctx } = test_canvasAPI();
    test_textAPI(ctx);
    test_toDataURL(canvas, ctx);
    test_offscreenCanvas();

    // 2. isNative
    test_isNative();

    // 3. isPointInPath
    test_isPointInPath(ctx);

    // 3 & 4. 指纹提取 + PNG 解析
    const { fp } = await test_fingerprintExtract();
    test_pngParsing(fp);

    // 5. 一致性检测
    await test_n0();
    await test_a0();
    await test_x0();

    // 6. 噪声检测
    await test_o0();

    log('======== 所有检测完成 ========', 'ok');
  } catch (e) {
    log(`✗ 检测异常: ${e.message}`, 'err');
    console.error(e);
  }

  btn.disabled = false;
  btn.textContent = '▶ 重新运行所有检测';
}
