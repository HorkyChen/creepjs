// @ts-nocheck
(function () {
  'use strict';

  var EXPECTED_RATE = 44100;
  var FFT_SIZE = 4096;
  var FFT_RENDER = FFT_SIZE * 4;
  var DEFAULT_RENDER_CHANNELS = 2;
  var DEFAULT_RENDER_SAMPLES = 500;
  var AUDIO_TRAP = Math.random();

  var KnownAudio = {
    '-20.538286209106445': [124.0434488439787, 124.04344968475198, 124.04347527516074, 124.04347503720783, 124.04347657808103],
    '-20.538288116455078': [
      124.04347518575378, 124.04347527516074, 124.04344884395687, 124.04344968475198, 124.04347657808103,
      124.04347730590962, 124.0434765110258, 124.04347656317987, 124.04375314689969,
      124.0434485301812, 124.0434496849557, 124.043453265891, 124.04345734833623, 124.04345808873768
    ],
    '-20.535268783569336': [
      124.080722568091, 124.08072256811283, 124.08072766105033, 124.08072787802666, 124.08072787804849,
      124.08074500028306, 124.0807470110085, 124.08075528279005, 124.08075643483608
    ],
    '-31.502187728881836': [35.74996626004577],
    '-31.502185821533203': [35.74996031448245, 35.7499681673944, 35.749968223273754],
    '-31.50218963623047': [35.74996031448245],
    '-31.509262084960938': [35.7383295930922, 35.73833402246237],
    '-29.837873458862305': [35.10892717540264, 35.10892752557993],
    '-29.83786964416504': [35.10893232002854, 35.10893253237009]
  };

  function getCtxCtor() {
    return window.OfflineAudioContext || window.webkitOfflineAudioContext || null;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(el, text, cls) {
    el.textContent = text;
    el.className = 'ac-status ' + (cls || '');
  }

  function appendLog(line) {
    var el = byId('log');
    el.textContent += line + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function appendProbeLog(line) {
    var el = byId('probeLog');
    el.textContent += line + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function verdict(ok) {
    return ok ? '<span class="ac-pass">PASS</span>' : '<span class="ac-fail">FAIL</span>';
  }

  function row(cells) {
    return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
  }

  function clearTables() {
    byId('t1body').innerHTML = '';
    byId('t2body').innerHTML = '';
    byId('t3body').innerHTML = '';
  }

  function clearDeepRoot() {
    byId('deepRoot').innerHTML = '';
  }

  function sectionTitle(text) {
    var div = document.createElement('div');
    div.className = 'ac-section-title';
    div.textContent = text;
    return div;
  }

  function makeGrid() {
    var div = document.createElement('div');
    div.className = 'ac-grid-wide';
    return div;
  }

  function makeMiniCard(cls, title) {
    var card = document.createElement('div');
    card.className = 'ac-mini-card ' + (cls || '');
    var heading = document.createElement('h4');
    heading.style.margin = '0 0 10px';
    heading.style.color = 'var(--ac-accent)';
    heading.textContent = title;
    card.appendChild(heading);
    return card;
  }

  function addDataRow(parent, label, valueNode, badgeNode) {
    var rowEl = document.createElement('div');
    rowEl.className = 'ac-data-row';
    var labelEl = document.createElement('span');
    labelEl.className = 'ac-label';
    labelEl.textContent = label;
    rowEl.appendChild(labelEl);
    if (typeof valueNode === 'string') {
      var valueEl = document.createElement('span');
      valueEl.className = 'ac-value';
      valueEl.textContent = valueNode;
      rowEl.appendChild(valueEl);
    } else {
      rowEl.appendChild(valueNode);
    }
    if (badgeNode) {
      rowEl.appendChild(badgeNode);
    }
    parent.appendChild(rowEl);
  }

  function makeBadge(type, text) {
    var span = document.createElement('span');
    span.className = 'ac-badge ' + type;
    span.textContent = text;
    return span;
  }

  function makePre(text, cls) {
    var pre = document.createElement('pre');
    pre.className = cls || 'ac-pre';
    pre.textContent = text;
    return pre;
  }

  function diffStr(a, b) {
    var sa = String(a);
    var sb = String(b);
    var wrapper = document.createElement('span');
    wrapper.className = 'ac-value';
    for (var i = 0; i < Math.max(sa.length, sb.length); i++) {
      var ca = sa[i] || '';
      var cb = sb[i] || '_';
      var span = document.createElement('span');
      span.textContent = cb;
      span.className = ca === cb ? 'ac-diff-match' : 'ac-diff-miss';
      wrapper.appendChild(span);
    }
    return wrapper;
  }

  function kvRow(key, value) {
    var tr = document.createElement('tr');
    var td1 = document.createElement('td');
    var td2 = document.createElement('td');
    td1.textContent = key;
    td2.textContent = String(value);
    tr.appendChild(td1);
    tr.appendChild(td2);
    return tr;
  }

  function buildTable(rows) {
    var table = document.createElement('table');
    table.className = 'ac-table';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Property</th><th>Value</th></tr>';
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    rows.forEach(function (rowEl) {
      tbody.appendChild(rowEl);
    });
    table.appendChild(tbody);
    return table;
  }

  function getSnapshot(arr, start, end) {
    var collection = [];
    for (var i = start; i < end; i++) {
      collection.push(arr[i]);
    }
    return collection;
  }

  function getSum(arr) {
    if (!arr || !arr.length) {
      return 0;
    }
    return Array.prototype.reduce.call(arr, function (acc, curr) {
      return acc + Math.abs(curr);
    }, 0);
  }

  function testRateHonoring() {
    var CtxCtor = getCtxCtor();
    if (!CtxCtor) {
      return Promise.resolve([{ error: 'OfflineAudioContext unsupported' }]);
    }
    var rates = [22050, 44100, 48000];
    return Promise.all(rates.map(function (rate) {
      return new Promise(function (resolve) {
        try {
          var samples = Math.min(rate, 4096);
          var ctx = new CtxCtor(1, samples, rate);
          var osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.start(0);
          ctx.oncomplete = function (e) {
            var buf = e.renderedBuffer;
            resolve({
              requested: rate,
              ctxRate: ctx.sampleRate,
              bufRate: buf.sampleRate,
              bufLength: buf.length,
              bufDuration: buf.duration
            });
          };
          ctx.startRendering();
        } catch (err) {
          resolve({ requested: rate, error: String(err) });
        }
      });
    }));
  }

  function displayT1(results) {
    byId('t1body').innerHTML = results.map(function (r) {
      if (r.error) {
        return row([
          (r.requested || '-') + ' Hz',
          '<span class="ac-fail">' + r.error + '</span>',
          '-', '-', '-', '-'
        ]);
      }
      var rateOk = r.ctxRate === r.requested && r.bufRate === r.requested;
      var expDur = Math.min(r.requested, 4096) / r.requested;
      var durOk = Math.abs(r.bufDuration - expDur) < 1e-4;
      return row([
        r.requested + ' Hz',
        String(r.ctxRate),
        String(r.bufRate),
        String(r.bufLength),
        r.bufDuration.toFixed(6) + ' s',
        verdict(rateOk && durOk)
      ]);
    }).join('');
  }

  function testFftBin(toneFreq) {
    return new Promise(function (resolve) {
      var CtxCtor = getCtxCtor();
      var ctx = new CtxCtor(1, FFT_RENDER, EXPECTED_RATE);
      var osc = ctx.createOscillator();
      var analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      osc.type = 'sine';
      osc.frequency.value = toneFreq;
      osc.connect(analyser);
      analyser.connect(ctx.destination);
      osc.start(0);

      ctx.oncomplete = function () {
        var bins = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(bins);

        var peakBin = 1;
        var peakVal = bins[1];
        for (var i = 2; i < bins.length; i++) {
          if (bins[i] > peakVal) {
            peakVal = bins[i];
            peakBin = i;
          }
        }

        var expectedBin = Math.round(toneFreq * FFT_SIZE / EXPECTED_RATE);
        var impliedRate = Math.round(toneFreq * FFT_SIZE / peakBin);
        var binErr = peakBin - expectedBin;

        resolve({
          toneFreq: toneFreq,
          expectedBin: expectedBin,
          actualBin: peakBin,
          binErr: binErr,
          peakDb: peakVal.toFixed(1),
          impliedRate: impliedRate
        });
      };

      ctx.startRendering();
    });
  }

  function displayT2(results) {
    byId('t2body').innerHTML = results.map(function (r) {
      var binOk = Math.abs(r.binErr) <= 1;
      var rateOk = Math.abs(r.impliedRate - EXPECTED_RATE) < 200;
      var errStr = (r.binErr >= 0 ? '+' : '') + r.binErr;
      return row([
        r.toneFreq + ' Hz',
        String(r.expectedBin),
        String(r.actualBin),
        binOk ? errStr : '<span class="ac-fail">' + errStr + '</span>',
        r.peakDb + ' dB',
        rateOk ? (r.impliedRate + ' Hz') : ('<span class="ac-fail">' + r.impliedRate + ' Hz</span>'),
        verdict(binOk && rateOk)
      ]);
    }).join('');
  }

  function testPcmZeroCrossing() {
    return new Promise(function (resolve) {
      var CtxCtor = getCtxCtor();
      var toneFreq = 1000;
      var samples = EXPECTED_RATE;
      var ctx = new CtxCtor(1, samples, EXPECTED_RATE);
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = toneFreq;
      osc.connect(ctx.destination);
      osc.start(0);

      ctx.oncomplete = function (e) {
        var data = e.renderedBuffer.getChannelData(0);
        var posZC = 0;
        for (var i = 1; i < data.length; i++) {
          if (data[i - 1] < 0 && data[i] >= 0) {
            posZC++;
          }
        }

        var expectedZC = Math.round(toneFreq * samples / EXPECTED_RATE);
        var impliedRate = posZC > 0 ? Math.round(toneFreq * samples / posZC) : 0;
        var deviation = posZC - expectedZC;

        resolve({
          toneFreq: toneFreq,
          samples: samples,
          expectedZC: expectedZC,
          actualZC: posZC,
          deviation: deviation,
          impliedRate: impliedRate
        });
      };

      ctx.startRendering();
    });
  }

  function displayT3(r) {
    var zcOk = Math.abs(r.deviation) <= 2;
    var rateOk = Math.abs(r.impliedRate - EXPECTED_RATE) < 200;
    var devStr = (r.deviation >= 0 ? '+' : '') + r.deviation;
    byId('t3body').innerHTML = row([
      r.toneFreq + ' Hz',
      String(r.samples),
      String(r.expectedZC),
      String(r.actualZC),
      zcOk ? devStr : ('<span class="ac-fail">' + devStr + '</span>'),
      rateOk ? (r.impliedRate + ' Hz') : ('<span class="ac-fail">' + r.impliedRate + ' Hz</span>'),
      verdict(zcOk && rateOk)
    ]);
  }

  function analyzeBins(bins) {
    var negInfCount = 0;
    var finiteCount = 0;
    var min = Infinity;
    var max = -Infinity;

    for (var i = 0; i < bins.length; i++) {
      var v = bins[i];
      if (v === -Infinity) {
        negInfCount++;
      } else if (Number.isFinite(v)) {
        finiteCount++;
        if (v < min) {
          min = v;
        }
        if (v > max) {
          max = v;
        }
      }
    }

    return {
      total: bins.length,
      finite: finiteCount,
      negInf: negInfCount,
      other: bins.length - finiteCount - negInfCount,
      min: finiteCount > 0 ? Number(min.toFixed(2)) : null,
      max: finiteCount > 0 ? Number(max.toFixed(2)) : null,
      allBins: Array.prototype.slice.call(bins).map(function (v) {
        return Number.isFinite(v) ? Number(v.toFixed(6)) : v;
      })
    };
  }

  function getProbeConfig() {
    var channelEl = byId('renderChannels');
    var sampleEl = byId('renderSamples');
    var channels = parseInt(channelEl && channelEl.value, 10);
    var samples = parseInt(sampleEl && sampleEl.value, 10);

    if (channels !== 1 && channels !== 2) {
      channels = DEFAULT_RENDER_CHANNELS;
    }
    if (!Number.isFinite(samples) || samples <= 0) {
      samples = DEFAULT_RENDER_SAMPLES;
    }

    return { channels: channels, samples: samples };
  }

  function runProbeSimulation() {
    return new Promise(function (resolve) {
      var CtxCtor = getCtxCtor();
      byId('probeLog').textContent = '';

      if (!CtxCtor) {
        appendProbeLog('[ERR] OfflineAudioContext unsupported');
        resolve(false);
        return;
      }

      var cfg = getProbeConfig();
      var renderChannels = cfg.channels;
      var renderSamples = cfg.samples;

      appendProbeLog('[1] new OfflineAudioContext(' + renderChannels + ', ' + renderSamples + ', 44100)');
      var ctx = new CtxCtor(renderChannels, renderSamples, EXPECTED_RATE);

      var osc = ctx.createOscillator();
      var comp = ctx.createDynamicsCompressor();
      var splitter = ctx.createChannelSplitter(renderChannels);
      var analysers = [];
      var ch;
      for (ch = 0; ch < renderChannels; ch++) {
        analysers.push(ctx.createAnalyser());
      }

      osc.type = 'triangle';
      osc.frequency.value = 10000;

      appendProbeLog('[2] connect: osc -> comp -> splitter -> analyser[ch]');
      osc.connect(comp);
      comp.connect(splitter);
      for (ch = 0; ch < renderChannels; ch++) {
        splitter.connect(analysers[ch], ch);
        analysers[ch].connect(ctx.destination);
      }

      osc.start(0);
      appendProbeLog('[3] osc.start(0), ctx.startRendering()');

      ctx.oncomplete = function (event) {
        var renderedLen = event.renderedBuffer.length;
        appendProbeLog('[oncomplete] renderedBuffer.length=' + renderedLen);

        var hadEmpty = false;
        var sums = [];

        for (ch = 0; ch < renderChannels; ch++) {
          var bins = new Float32Array(analysers[ch].frequencyBinCount);
          analysers[ch].getFloatFrequencyData(bins);
          var stats = analyzeBins(bins);

          appendProbeLog('ch' + ch + ': finite=' + stats.finite + ', -Infinity=' + stats.negInf + ', min=' + stats.min + ', max=' + stats.max);
          appendProbeLog('ch' + ch + ': allBins=' + JSON.stringify(stats.allBins));

          var picked = Array.prototype.filter.call(bins, function (x) { return x > -Infinity; });
          if (!picked.length) {
            hadEmpty = true;
            sums.push(null);
          } else {
            sums.push(picked.reduce(function (a, b) { return a + b; }));
          }
        }

        try { osc.disconnect(); } catch (e) {}
        try { comp.disconnect(); } catch (e2) {}
        try { splitter.disconnect(); } catch (e3) {}
        for (ch = 0; ch < analysers.length; ch++) {
          try { analysers[ch].disconnect(); } catch (e4) {}
        }

        if (hadEmpty) {
          appendProbeLog('[ERR] Reduce of empty array with no initial value');
          resolve(false);
          return;
        }

        appendProbeLog('[OK] channel sums: ' + sums.map(function (s, i) {
          return 'ch' + i + '=' + s.toFixed(6);
        }).join(' '));
        resolve(true);
      };

      ctx.startRendering();
    });
  }

  function hasFakeAudio() {
    return new Promise(function (resolve) {
      try {
        var CtxCtor = getCtxCtor();
        var context = new CtxCtor(1, 100, 44100);
        var oscillator = context.createOscillator();
        oscillator.frequency.value = 0;
        oscillator.start(0);
        context.startRendering();
        context.oncomplete = function (event) {
          var channelData = event.renderedBuffer.getChannelData(0);
          oscillator.disconnect();
          resolve('' + Array.from(new Set(channelData)) !== '0');
        };
      } catch (error) {
        resolve(null);
      }
    });
  }

  function getRenderedBuffer(bufferLen) {
    return new Promise(function (resolve) {
      try {
        var CtxCtor = getCtxCtor();
        var context = new CtxCtor(1, bufferLen, 44100);
        var analyser = context.createAnalyser();
        var oscillator = context.createOscillator();
        var dynamicsCompressor = context.createDynamicsCompressor();

        oscillator.type = 'triangle';
        oscillator.frequency.value = 10000;
        dynamicsCompressor.threshold.value = -50;
        dynamicsCompressor.knee.value = 40;
        dynamicsCompressor.attack.value = 0;

        oscillator.connect(dynamicsCompressor);
        dynamicsCompressor.connect(analyser);
        dynamicsCompressor.connect(context.destination);

        oscillator.start(0);
        context.startRendering();

        context.addEventListener('complete', function (event) {
          try {
            dynamicsCompressor.disconnect();
            oscillator.disconnect();
            var floatFrequencyData = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(floatFrequencyData);
            var floatTimeDomainData = new Float32Array(analyser.fftSize);
            if ('getFloatTimeDomainData' in analyser) {
              analyser.getFloatTimeDomainData(floatTimeDomainData);
            }
            resolve({
              floatFrequencyData: floatFrequencyData,
              floatTimeDomainData: floatTimeDomainData,
              buffer: event.renderedBuffer,
              compressorGainReduction: (
                dynamicsCompressor.reduction && typeof dynamicsCompressor.reduction === 'object' ?
                  dynamicsCompressor.reduction.value :
                  dynamicsCompressor.reduction
              )
            });
          } catch (error) {
            resolve(null);
          }
        });
      } catch (error) {
        resolve(null);
      }
    });
  }

  function checkSilenceLie() {
    try {
      var CtxCtor = getCtxCtor();
      var context = new CtxCtor(1, 5000, 44100);
      var analyser = context.createAnalyser();
      var dataArray = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(dataArray);
      return new Set(dataArray).size;
    } catch (error) {
      return null;
    }
  }

  function getRandFromRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getCopyFrom(rand, buffer, copy) {
    var length = buffer.length;
    var max = 20;
    var start = getRandFromRange(275, length - (max + 1));
    var mid = start + max / 2;
    var end = start + max;

    buffer.getChannelData(0)[start] = rand;
    buffer.getChannelData(0)[mid] = rand;
    buffer.getChannelData(0)[end] = rand;
    buffer.copyFromChannel(copy, 0);
    var attack = [
      buffer.getChannelData(0)[start] === 0 ? Math.random() : 0,
      buffer.getChannelData(0)[mid] === 0 ? Math.random() : 0,
      buffer.getChannelData(0)[end] === 0 ? Math.random() : 0
    ];
    return Array.from(new Set(Array.prototype.concat.call(Array.from(buffer.getChannelData(0)), Array.from(copy), attack))).filter(function (x) {
      return x !== 0;
    });
  }

  function getCopyTo(rand, buffer, copy) {
    buffer.copyToChannel(copy.map(function () { return rand; }), 0);
    var frequency = buffer.getChannelData(0)[0];
    var dataAttacked = Array.from(buffer.getChannelData(0)).map(function (x) {
      return x !== frequency || !x ? Math.random() : x;
    });
    return dataAttacked.filter(function (x) {
      return x !== frequency;
    });
  }

  function getNoiseFactor() {
    try {
      var length = 2000;
      var result = Array.from(new Set([
        ].concat(
          getCopyFrom(AUDIO_TRAP, new AudioBuffer({ length: length, sampleRate: 44100 }), new Float32Array(length)),
          getCopyTo(AUDIO_TRAP, new AudioBuffer({ length: length, sampleRate: 44100 }), new Float32Array(length))
        )));
      return +(result.length !== 1 && result.reduce(function (acc, n) { return acc + +n; }, 0));
    } catch (error) {
      appendLog('[DeepInspection] noiseFactor error: ' + String(error));
      return 0;
    }
  }

  function getNodeValues() {
    var CtxCtor = getCtxCtor();
    var context = new CtxCtor(1, 100, 44100);
    var analyser = context.createAnalyser();
    var oscillator = context.createOscillator();
    var dynamicsCompressor = context.createDynamicsCompressor();
    var biquadFilter = context.createBiquadFilter();
    function safe(fn) {
      try {
        return fn();
      } catch (error) {
        return '[error]';
      }
    }
    return {
      'AnalyserNode.channelCount': safe(function () { return analyser.channelCount; }),
      'AnalyserNode.channelCountMode': safe(function () { return analyser.channelCountMode; }),
      'AnalyserNode.channelInterpretation': safe(function () { return analyser.channelInterpretation; }),
      'AnalyserNode.context.sampleRate': safe(function () { return analyser.context.sampleRate; }),
      'AnalyserNode.fftSize': safe(function () { return analyser.fftSize; }),
      'AnalyserNode.frequencyBinCount': safe(function () { return analyser.frequencyBinCount; }),
      'AnalyserNode.maxDecibels': safe(function () { return analyser.maxDecibels; }),
      'AnalyserNode.minDecibels': safe(function () { return analyser.minDecibels; }),
      'AnalyserNode.numberOfInputs': safe(function () { return analyser.numberOfInputs; }),
      'AnalyserNode.numberOfOutputs': safe(function () { return analyser.numberOfOutputs; }),
      'AnalyserNode.smoothingTimeConstant': safe(function () { return analyser.smoothingTimeConstant; }),
      'AnalyserNode.context.listener.forwardX.maxValue': safe(function () { return analyser.context.listener.forwardX.maxValue; }),
      'BiquadFilterNode.gain.maxValue': safe(function () { return biquadFilter.gain.maxValue; }),
      'BiquadFilterNode.frequency.defaultValue': safe(function () { return biquadFilter.frequency.defaultValue; }),
      'BiquadFilterNode.frequency.maxValue': safe(function () { return biquadFilter.frequency.maxValue; }),
      'DynamicsCompressorNode.attack.defaultValue': safe(function () { return dynamicsCompressor.attack.defaultValue; }),
      'DynamicsCompressorNode.knee.defaultValue': safe(function () { return dynamicsCompressor.knee.defaultValue; }),
      'DynamicsCompressorNode.knee.maxValue': safe(function () { return dynamicsCompressor.knee.maxValue; }),
      'DynamicsCompressorNode.ratio.defaultValue': safe(function () { return dynamicsCompressor.ratio.defaultValue; }),
      'DynamicsCompressorNode.ratio.maxValue': safe(function () { return dynamicsCompressor.ratio.maxValue; }),
      'DynamicsCompressorNode.release.defaultValue': safe(function () { return dynamicsCompressor.release.defaultValue; }),
      'DynamicsCompressorNode.release.maxValue': safe(function () { return dynamicsCompressor.release.maxValue; }),
      'DynamicsCompressorNode.threshold.defaultValue': safe(function () { return dynamicsCompressor.threshold.defaultValue; }),
      'DynamicsCompressorNode.threshold.minValue': safe(function () { return dynamicsCompressor.threshold.minValue; }),
      'OscillatorNode.detune.maxValue': safe(function () { return oscillator.detune.maxValue; }),
      'OscillatorNode.detune.minValue': safe(function () { return oscillator.detune.minValue; }),
      'OscillatorNode.frequency.defaultValue': safe(function () { return oscillator.frequency.defaultValue; }),
      'OscillatorNode.frequency.maxValue': safe(function () { return oscillator.frequency.maxValue; }),
      'OscillatorNode.frequency.minValue': safe(function () { return oscillator.frequency.minValue; })
    };
  }

  function renderDeepInspection(data) {
    var root = byId('deepRoot');
    root.innerHTML = '';

    var trapFail = data.noiseFactor !== 0 && data.noiseFactor !== null;
    var noiseVal = data.noiseFactor || data.fallbackNoise;
    var knownSums = KnownAudio[String(data.reduction)] || [];
    var sampleSumMatch = knownSums.length > 0 && knownSums.indexOf(data.sampleSum) !== -1;

    root.appendChild(sectionTitle('1. Lie & Anomaly Detection'));
    var g1 = makeGrid();

    var cSilence = makeMiniCard(data.silenceUniqueSize > 1 ? 'ac-fail-card' : 'ac-pass-card', 'AnalyserNode.getFloatFrequencyData (silence)');
    addDataRow(cSilence, 'unique values before rendering', String(data.silenceUniqueSize), makeBadge(data.silenceUniqueSize === 1 ? 'ac-pass-badge' : 'ac-fail-badge', data.silenceUniqueSize === 1 ? 'OK: all -Infinity' : 'LIE: non-silence before render'));
    g1.appendChild(cSilence);

    var cFake = makeMiniCard(data.audioIsFake ? 'ac-fail-card' : 'ac-pass-card', 'hasFakeAudio (0-Hz oscillator)');
    addDataRow(cFake, 'channel data is all-zero', data.audioIsFake === null ? 'error' : String(!data.audioIsFake), makeBadge(data.audioIsFake ? 'ac-fail-badge' : 'ac-pass-badge', data.audioIsFake ? 'FAKE: non-zero samples' : 'OK: all zero'));
    g1.appendChild(cFake);

    var cMatch = makeMiniCard(data.sampleMatch === false ? 'ac-fail-card' : 'ac-pass-card', 'AudioBuffer: getChannelData vs copyFromChannel');
    addDataRow(cMatch, 'copyFromChannel supported', String(data.copyFromChannelSupported));
    addDataRow(cMatch, 'samples match', String(data.sampleMatch), makeBadge(data.sampleMatch ? 'ac-pass-badge' : (data.copyFromChannelSupported ? 'ac-fail-badge' : 'ac-info-badge'), data.sampleMatch ? 'OK' : (data.copyFromChannelSupported ? 'MISMATCH LIE' : 'unsupported')));
    g1.appendChild(cMatch);

    var cTrap = makeMiniCard(trapFail ? 'ac-fail-card' : 'ac-pass-card', 'AudioBuffer Write/Read Noise Trap');
    addDataRow(cTrap, 'AUDIO_TRAP seed', String(AUDIO_TRAP));
    addDataRow(cTrap, 'noiseFactor', String(data.noiseFactor), makeBadge(trapFail ? 'ac-fail-badge' : 'ac-pass-badge', trapFail ? 'NOISE DETECTED' : 'clean'));
    addDataRow(cTrap, 'fallback noise (PCM sum[0..100])', String(data.fallbackNoise));
    addDataRow(cTrap, 'final noise used for display', String(noiseVal));
    addDataRow(cTrap, 'trap display', !noiseVal ? String(AUDIO_TRAP) : diffStr(AUDIO_TRAP, noiseVal));
    g1.appendChild(cTrap);

    root.appendChild(g1);

    root.appendChild(sectionTitle('2. Rendered Audio Fingerprint Sums'));
    var g2 = makeGrid();

    var cSums = makeMiniCard(knownSums.length ? (sampleSumMatch ? 'ac-pass-card' : 'ac-warn-card') : '', 'Key Fingerprint Values');
    addDataRow(cSums, 'compressorGainReduction', String(data.reduction));
    addDataRow(cSums, 'floatFrequencyDataSum', String(data.freqSum));
    addDataRow(cSums, 'floatTimeDomainDataSum', String(data.timeSum));
    addDataRow(cSums, 'sampleSum (bins[4500..5000])', String(data.sampleSum));
    addDataRow(cSums, 'totalUniqueSamples', String(data.totalUnique));
    if (!knownSums.length) {
      addDataRow(cSums, 'KnownAudio match', 'unknown gain key', makeBadge('ac-warn-badge', 'unknown'));
    } else if (sampleSumMatch) {
      addDataRow(cSums, 'KnownAudio match', 'known good value', makeBadge('ac-pass-badge', 'match'));
    } else {
      addDataRow(cSums, 'KnownAudio match', 'sampleSum not in known list', makeBadge('ac-warn-badge', 'suspicious'));
    }
    if (knownSums.length) {
      cSums.appendChild(makePre(knownSums.map(function (sum) {
        return (sum === data.sampleSum ? '✓ ' : '  ') + sum;
      }).join('\n')));
    }
    g2.appendChild(cSums);

    var cPattern = makeMiniCard('', 'Pattern Key (gain,freq,time)');
    cPattern.appendChild(makePre([data.reduction, data.freqSum, data.timeSum].join(',')));
    g2.appendChild(cPattern);

    root.appendChild(g2);

    root.appendChild(sectionTitle('3. Raw Sample Snapshots'));
    var g3 = makeGrid();
    var cBins = makeMiniCard('', 'getChannelData [4500..4600]');
    cBins.appendChild(makePre(data.binsSample.join('\n'), 'ac-pre ac-sample-row'));
    g3.appendChild(cBins);
    var cCopy = makeMiniCard('', 'copyFromChannel [4500..4600]');
    cCopy.appendChild(makePre(data.copyFromChannelSupported ? data.copySample.join('\n') : '[unsupported]', 'ac-pre ac-sample-row'));
    g3.appendChild(cCopy);
    var cFreq = makeMiniCard('', 'floatFrequencyData [0..32]');
    cFreq.appendChild(makePre(data.freqSample.join('\n'), 'ac-pre ac-sample-row'));
    g3.appendChild(cFreq);
    var cTime = makeMiniCard('', 'floatTimeDomainData [0..32]');
    cTime.appendChild(makePre(data.timeSample.length ? data.timeSample.join('\n') : '[unsupported]', 'ac-pre ac-sample-row'));
    g3.appendChild(cTime);
    root.appendChild(g3);

    root.appendChild(sectionTitle('4. AudioNode Property Values (fingerprint)'));
    var g4 = makeGrid();
    var cVals = makeMiniCard('', 'All property values');
    cVals.appendChild(buildTable(Object.keys(data.values).map(function (key) {
      return kvRow(key, data.values[key]);
    })));
    g4.appendChild(cVals);
    root.appendChild(g4);

    root.appendChild(sectionTitle('5. Sample Uniqueness & Noise Detail'));
    var g5 = makeGrid();
    var cUniq = makeMiniCard(data.totalUnique === 5000 ? 'ac-warn-card' : 'ac-pass-card', 'Sample Uniqueness');
    addDataRow(cUniq, 'bufferLen', '5000');
    addDataRow(cUniq, 'totalUniqueSamples', String(data.totalUnique), makeBadge(data.totalUnique === 5000 ? 'ac-warn-badge' : 'ac-pass-badge', data.totalUnique === 5000 ? 'too high (trash)' : 'normal'));
    g5.appendChild(cUniq);
    var cNoise = makeMiniCard(trapFail ? 'ac-fail-card' : 'ac-pass-card', 'getCopyFrom / getCopyTo Attack Detail');
    addDataRow(cNoise, 'noiseFactor (0 = clean)', String(data.noiseFactor));
    addDataRow(cNoise, 'fallback PCM noise sum', String(data.fallbackNoise));
    addDataRow(cNoise, 'noise used (noiseFactor || fallback)', String(noiseVal));
    addDataRow(cNoise, 'lied', String(data.lied), makeBadge(data.lied ? 'ac-fail-badge' : 'ac-pass-badge', data.lied ? 'YES' : 'NO'));
    var explain = document.createElement('div');
    explain.className = 'ac-muted';
    explain.style.marginTop = '8px';
    explain.textContent = 'The trap line compares AUDIO_TRAP with noise via charDiff. Even a clean browser can show many highlighted characters because fallback PCM noise is not equal to AUDIO_TRAP.';
    cNoise.appendChild(explain);
    g5.appendChild(cNoise);
    root.appendChild(g5);
  }

  function runDeepInspection() {
    return new Promise(function (resolve) {
      var CtxCtor = getCtxCtor();
      clearDeepRoot();

      if (!CtxCtor) {
        resolve({ unsupported: true });
        return;
      }

      var bufferLen = 5000;
      var silenceUniqueSize = checkSilenceLie();
      var values = getNodeValues();
      var noiseFactor = getNoiseFactor();

      Promise.all([
        hasFakeAudio(),
        getRenderedBuffer(bufferLen)
      ]).then(function (results) {
        var audioIsFake = results[0];
        var audioData = results[1];
        var reduction = null;
        var freqSum = 0;
        var timeSum = 0;
        var sampleSum = 0;
        var totalUnique = 0;
        var binsSample = [];
        var copySample = [];
        var freqSample = [];
        var timeSample = [];
        var sampleMatch = null;
        var copyFromChannelSupported = false;
        var fallbackNoise = 0;
        var lied = false;

        if (audioData) {
          var floatFrequencyData = audioData.floatFrequencyData;
          var floatTimeDomainData = audioData.floatTimeDomainData;
          var buffer = audioData.buffer;

          reduction = audioData.compressorGainReduction;
          freqSum = getSum(floatFrequencyData);
          timeSum = getSum(floatTimeDomainData);

          var copy = new Float32Array(bufferLen);
          var bins = new Float32Array();
          if (buffer) {
            buffer.copyFromChannel && buffer.copyFromChannel(copy, 0);
            bins = buffer.getChannelData ? buffer.getChannelData(0) : [];
          }

          binsSample = getSnapshot(Array.from(bins), 4500, 4600);
          copySample = getSnapshot(Array.from(copy), 4500, 4600);
          sampleSum = getSum(getSnapshot(Array.from(bins), 4500, bufferLen));
          totalUnique = new Set(Array.from(bins)).size;
          freqSample = getSnapshot(Array.from(floatFrequencyData), 0, 32);
          timeSample = getSnapshot(Array.from(floatTimeDomainData), 0, 32);
          copyFromChannelSupported = 'copyFromChannel' in AudioBuffer.prototype;
          sampleMatch = copyFromChannelSupported ? ('' + binsSample === '' + copySample) : null;
          fallbackNoise = Array.from(new Set(Array.prototype.slice.call(bins, 0, 100))).reduce(function (acc, n) {
            return acc + n;
          }, 0);
        }

        if (audioIsFake) {
          lied = true;
        }
        if (copyFromChannelSupported && sampleMatch === false) {
          lied = true;
        }
        if (noiseFactor) {
          lied = true;
        }
        if (silenceUniqueSize > 1) {
          lied = true;
        }

        var deepData = {
          silenceUniqueSize: silenceUniqueSize,
          audioIsFake: audioIsFake,
          sampleMatch: sampleMatch,
          copyFromChannelSupported: copyFromChannelSupported,
          noiseFactor: noiseFactor,
          fallbackNoise: fallbackNoise,
          reduction: reduction,
          freqSum: freqSum,
          timeSum: timeSum,
          sampleSum: sampleSum,
          totalUnique: totalUnique,
          binsSample: binsSample,
          copySample: copySample,
          freqSample: freqSample,
          timeSample: timeSample,
          values: values,
          lied: lied
        };

        renderDeepInspection(deepData);
        resolve(deepData);
      }).catch(function (error) {
        resolve({ error: String(error) });
      });
    });
  }

  function runAllTests() {
    var CtxCtor = getCtxCtor();
    var allStatus = byId('allStatus');
    var probeStatus = byId('probeStatus');
    var deepStatus = byId('deepStatus');
    var runAllBtn = byId('runAllBtn');
    var runProbeBtn = byId('runProbeBtn');
    var runDeepBtn = byId('runDeepBtn');

    byId('log').textContent = '';
    byId('probeLog').textContent = '';
    clearTables();
    clearDeepRoot();

    if (!CtxCtor) {
      setStatus(allStatus, 'Unsupported', 'ac-fail');
      setStatus(probeStatus, 'Unsupported', 'ac-fail');
      setStatus(deepStatus, 'Unsupported', 'ac-fail');
      appendLog('ERROR: OfflineAudioContext unsupported in this browser.');
      return;
    }

    runAllBtn.disabled = true;
    runProbeBtn.disabled = true;
    runDeepBtn.disabled = true;
    setStatus(allStatus, 'Running', 'ac-warn');
    setStatus(probeStatus, 'Waiting', 'ac-warn');
    setStatus(deepStatus, 'Waiting', 'ac-warn');

    var toneFreqs = [440, 1000, 5000, 10000];

    Promise.all([
      testRateHonoring(),
      Promise.all(toneFreqs.map(testFftBin)),
      testPcmZeroCrossing()
    ]).then(function (results) {
      displayT1(results[0]);
      displayT2(results[1]);
      displayT3(results[2]);
      appendLog('[SampleRate] tests completed');
      setStatus(probeStatus, 'Running', 'ac-warn');
      return runProbeSimulation();
    }).then(function (probeOk) {
      setStatus(probeStatus, probeOk ? 'Normal' : 'Abnormal', probeOk ? 'ac-pass' : 'ac-fail');
      setStatus(deepStatus, 'Running', 'ac-warn');
      appendLog('[Probe] completed: ' + (probeOk ? 'normal' : 'abnormal'));
      return runDeepInspection();
    }).then(function (deepData) {
      if (deepData && deepData.unsupported) {
        setStatus(deepStatus, 'Unsupported', 'ac-fail');
      } else if (deepData && deepData.error) {
        setStatus(deepStatus, 'Error', 'ac-fail');
        appendLog('[DeepInspection] error: ' + deepData.error);
      } else {
        setStatus(deepStatus, deepData.lied ? 'Flagged' : 'Clean', deepData.lied ? 'ac-fail' : 'ac-pass');
        appendLog('[DeepInspection] completed: lied=' + deepData.lied + ', noise=' + deepData.noiseFactor + ', sampleSum=' + deepData.sampleSum);
      }
      setStatus(allStatus, 'Completed', 'ac-pass');
    }).catch(function (err) {
      appendLog('FATAL: ' + String(err));
      setStatus(allStatus, 'Error', 'ac-fail');
      setStatus(probeStatus, 'Error', 'ac-fail');
      setStatus(deepStatus, 'Error', 'ac-fail');
    }).finally(function () {
      runAllBtn.disabled = false;
      runProbeBtn.disabled = false;
      runDeepBtn.disabled = false;
    });
  }

  byId('runAllBtn').addEventListener('click', runAllTests);
  byId('runProbeBtn').addEventListener('click', function () {
    var probeStatus = byId('probeStatus');
    setStatus(probeStatus, 'Running', 'ac-warn');
    runProbeSimulation().then(function (ok) {
      setStatus(probeStatus, ok ? 'Normal' : 'Abnormal', ok ? 'ac-pass' : 'ac-fail');
    }).catch(function (err) {
      appendProbeLog('FATAL: ' + String(err));
      setStatus(probeStatus, 'Error', 'ac-fail');
    });
  });
  byId('runDeepBtn').addEventListener('click', function () {
    var deepStatus = byId('deepStatus');
    setStatus(deepStatus, 'Running', 'ac-warn');
    runDeepInspection().then(function (deepData) {
      if (deepData && deepData.error) {
        setStatus(deepStatus, 'Error', 'ac-fail');
        appendLog('[DeepInspection] error: ' + deepData.error);
        return;
      }
      if (deepData && deepData.unsupported) {
        setStatus(deepStatus, 'Unsupported', 'ac-fail');
        return;
      }
      setStatus(deepStatus, deepData.lied ? 'Flagged' : 'Clean', deepData.lied ? 'ac-fail' : 'ac-pass');
      appendLog('[DeepInspection] completed: lied=' + deepData.lied + ', noise=' + deepData.noiseFactor + ', sampleSum=' + deepData.sampleSum);
    }).catch(function (err) {
      appendLog('[DeepInspection] fatal: ' + String(err));
      setStatus(deepStatus, 'Error', 'ac-fail');
    });
  });

  runAllTests();
})();
