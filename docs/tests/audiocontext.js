(function () {
  'use strict';

  var EXPECTED_RATE = 44100;
  var FFT_SIZE = 4096;
  var FFT_RENDER = FFT_SIZE * 4;
  var DEFAULT_RENDER_CHANNELS = 2;
  var DEFAULT_RENDER_SAMPLES = 500;

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
      var TONE_FREQ = 1000;
      var SAMPLES = EXPECTED_RATE;
      var ctx = new CtxCtor(1, SAMPLES, EXPECTED_RATE);
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = TONE_FREQ;
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

        var expectedZC = Math.round(TONE_FREQ * SAMPLES / EXPECTED_RATE);
        var impliedRate = posZC > 0 ? Math.round(TONE_FREQ * SAMPLES / posZC) : 0;
        var deviation = posZC - expectedZC;

        resolve({
          toneFreq: TONE_FREQ,
          samples: SAMPLES,
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

  function runAllTests() {
    var CtxCtor = getCtxCtor();
    var allStatus = byId('allStatus');
    var probeStatus = byId('probeStatus');
    var runAllBtn = byId('runAllBtn');
    var runProbeBtn = byId('runProbeBtn');

    byId('log').textContent = '';
    byId('probeLog').textContent = '';
    clearTables();

    if (!CtxCtor) {
      setStatus(allStatus, 'Unsupported', 'ac-fail');
      setStatus(probeStatus, 'Unsupported', 'ac-fail');
      appendLog('ERROR: OfflineAudioContext unsupported in this browser.');
      return;
    }

    runAllBtn.disabled = true;
    runProbeBtn.disabled = true;
    setStatus(allStatus, 'Running', 'ac-warn');
    setStatus(probeStatus, 'Waiting', 'ac-warn');

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
      setStatus(allStatus, 'Completed', 'ac-pass');
    }).catch(function (err) {
      appendLog('FATAL: ' + String(err));
      setStatus(allStatus, 'Error', 'ac-fail');
      setStatus(probeStatus, 'Error', 'ac-fail');
    }).finally(function () {
      runAllBtn.disabled = false;
      runProbeBtn.disabled = false;
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

  runAllTests();
})();
