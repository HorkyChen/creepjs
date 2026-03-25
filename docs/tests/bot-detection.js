(function () {
  const root = document.getElementById('fingerprint-data');
  if (!root) {
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    .bot-detection, .bot-detection * { box-sizing: border-box; margin: 0; padding: 0; }
    .bot-detection {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      padding: 24px;
      border-radius: 8px;
      margin-top: 10px;
    }
    .bot-detection h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .bot-detection .subtitle { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
    .bot-detection .summary-bar {
      display: flex; align-items: center; gap: 12px;
      background: #1e2330; border-radius: 10px; padding: 16px 20px;
      margin-bottom: 24px; border: 1px solid #2d3548;
    }
    .bot-detection .summary-icon { font-size: 32px; }
    .bot-detection .summary-label { font-size: 13px; color: #94a3b8; }
    .bot-detection .summary-verdict { font-size: 20px; font-weight: 700; }
    .bot-detection .verdict-pass { color: #4ade80; }
    .bot-detection .verdict-fail { color: #fb5138; }

    .bot-detection .section { margin-bottom: 20px; }
    .bot-detection .section-title {
      font-size: 13px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: #64748b; margin-bottom: 10px;
    }
    .bot-detection .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }

    .bot-detection .card {
      background: #1e2330; border-radius: 8px; padding: 14px 16px;
      border: 1px solid #2d3548; transition: border-color 0.2s;
    }
    .bot-detection .card.detecting { opacity: 0.5; }
    .bot-detection .card.fail { border-color: #fb5138; background: #2a1a1a; }
    .bot-detection .card.pass { border-color: #2d3548; }

    .bot-detection .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .bot-detection .dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
      background: #334155;
    }
    .bot-detection .dot.pass { background: #4ade80; }
    .bot-detection .dot.fail { background: #fb5138; }
    .bot-detection .dot.detecting { background: #f59e0b; animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.4 } }

    .bot-detection .card-name { font-size: 13px; font-weight: 600; }
    .bot-detection .card-value { font-size: 11px; color: #64748b; margin-top: 2px; word-break: break-all; }
    .bot-detection .card-value.detected { color: #fb5138; }

    .bot-detection .async-note { font-size: 11px; color: #64748b; margin-top: 16px; text-align: center; }
  `;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="bot-detection">
      <h1>🤖 Bot Detection Test</h1>
      <p class="subtitle">基于 browserscan.net 检测逻辑实现 — 检测 WebDriver、CDP、DevTools（Worker debugger 超时 + console.debug stack getter）、Navigator 篡改、User-Agent</p>

      <div class="summary-bar" id="summary-bar">
        <div class="summary-icon" id="summary-icon">⏳</div>
        <div>
          <div class="summary-label">综合判断</div>
          <div class="summary-verdict" id="summary-verdict">检测中...</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">① WebDriver / 自动化框架检测（15 项）</div>
        <div class="grid" id="grid-webdriver"></div>
      </div>

      <div class="section">
        <div class="section-title">② CDP & DevTools 检测</div>
        <div class="grid" id="grid-cdp"></div>
      </div>

      <div class="section">
        <div class="section-title">③ Navigator 属性原生性检测</div>
        <div class="grid" id="grid-navigator"></div>
      </div>

      <div class="section">
        <div class="section-title">④ User-Agent 检测</div>
        <div class="grid" id="grid-ua"></div>
      </div>

      <p class="async-note" id="async-note">Worker debugger 检测为异步，结果将在 ~500ms 后更新</p>
    </div>
  `;

  function detectWebdriver() {
    return !!navigator.webdriver;
  }

  function detectWebdriverAdvance() {
    for (const key in window) {
      if (/^([a-z]){3}_.*_(Array|Promise|Symbol|Proxy|JSON|Object)$/.test(key)) {
        return true;
      }
    }
    const windowMarkers = [
      '__selenium_evaluate', '__selenium_unwrapped', '_selenium',
      '_Selenium_IDE_Recorder', '__fxdriver_evaluate', '__driver_evaluate',
      '__webdriver_evaluate', '__driver_unwrapped', '__nw_top_frame',
      'callSelenium', '$chrome_asyncScriptInfo', '$cdc_asdjflasutopfhv_',
      '__nw_initWindow', '__nw_onDestory', '__nw_removeEventListeners',
      'fmget_target', 'callPhantom_evaluate', 'selenium-evaluate-response',
      'webdriver-evaluate-response', '__driver_script_func',
    ];
    for (const marker of windowMarkers) {
      if (marker in window) return true;
    }
    const docMarkers = [
      '__fxdriver_evaluate', '__selenium_evaluate', '__driver_evaluate',
      '__webdriver_evaluate', '__driver_unwrapped', '__webdriver_script_func',
      '__driver_script_func', 'callPhantom', 'callSelenium',
    ];
    for (const marker of docMarkers) {
      if (marker in document) return true;
    }
    const el = document.documentElement;
    if (el.getAttribute('webdriver') !== null) return true;
    if (el.getAttribute('__selenium_evaluate') !== null) return true;
    if (el.getAttribute('__webdriver_script_fn') !== null) return true;
    return false;
  }

  function detectSelenium() {
    return 'slimerjs' in window || 'triflejs' in window;
  }

  function detectNightmareJS() {
    return [
      '__nightmare' in window,
      'nightmare' in window,
      /PhantomJS/.test(navigator.userAgent),
    ].some(Boolean);
  }

  function detectPhantomJS() {
    return 'callPhantom' in window || '_phantom' in window || '__phantomas' in window;
  }

  function detectAwesomium() {
    return 'awesomium' in window || 'RunPerfTest' in window;
  }

  function detectCEF() {
    return 'CefSharp' in window;
  }

  function detectCEFSharp() {
    return 'emit' in window;
  }

  function detectCoachJS() {
    return 'fmget_target' in window;
  }

  function detectFMiner() {
    return 'Sequentum' in window;
  }

  function detectGeb() {
    return 'geb' in window || 'WatiN' in window;
  }

  function detectPhantomas() {
    return 'Buffer' in window;
  }

  function detectRhino() {
    return 'spawn' in window;
  }

  function detectWebdriverIO() {
    if ('domAutomation' in window) return true;
    if ('domAutomationController' in window) return true;
    for (const key in window) {
      if (key.startsWith('BrowserAutomationStudio')) return true;
    }
    return false;
  }

  function detectHeadlessChrome() {
    const windowProps = [
      'webdriver', '__webdriver_evaluate', '__selenium_evaluate',
      '__fxdriver_evaluate', '__driver_evaluate', '__webdriver_script_func',
      '__driver_script_func', '__webdriver_script_fn', '__driver_unwrapped',
      '__webdriver_unwrapped', '__selenium_unwrapped', '__fxdriver_unwrapped',
      '_Selenium_IDE_Recorder', '__lastWatiningId', '_WEBDRIVER_ELEM_CACHE',
      '__utils__', '__nw_windows', 'callPhantom', '_phantom', '__phantomas',
      'nightmare', '__nightmare', 'awesomium', 'CefSharp', 'fmget_target',
      'Sequentum', 'geb', 'spawn', 'Buffer',
      'BrowserAutomationStudio_GetFrameIndex',
      'BrowserAutomationStudio_GetInternal',
      'BrowserAutomationStudio_GetGeolocation',
      'BrowserAutomationStudio_RestoreDate',
      'browser_automation_studio_find_result',
      'browser_automation_studio_result',
      'browser_automation_studio_object_result',
      'wdioElectron',
    ];
    for (const prop of windowProps) {
      if (window[prop]) return true;
    }

    const docProps = [
      '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate',
      '__driver_evaluate', '__driver_unwrapped', '__webdriver_script_func',
      '__webdriver_script_fn', '__driver_script_func', '$cdc_asdjflasutopfhv_',
      '$chrome_asyncScriptInfo', 'callSelenium', '__$webdriverAsyncExecutor',
      'callPhantom', '__selenium_unwrapped', '__fxdriver_unwrapped',
      'webdriverCallback', 'webdriver-evaluate-response',
    ];
    for (const prop of docProps) {
      if (document[prop]) return true;
    }

    for (const key in document) {
      if (/^\$[a-z]dc_/.test(key) && document[key] && document[key].toString) return true;
    }

    const stackKeywords = ['phantomjs', 'webdriver', 'selenium', 'casperjs', 'triflejs', 'specterjs'];
    try {
      null[0]();
    } catch (error) {
      const stack = (error.stack || '').toLowerCase();
      for (const keyword of stackKeywords) {
        if (stack.includes(keyword)) return true;
      }
    }

    return false;
  }

  function detectCDP() {
    try {
      if (!window.chrome) return false;
      const chromeStr = window.chrome.toString ? window.chrome.toString() : '';
      if (chromeStr.indexOf('native') !== -1) {
        const nativeChrome = window.chrome.loadTimes || window.chrome.csi;
        if (nativeChrome) {
          const fnStr = Function.prototype.toString.call(nativeChrome);
          if (!fnStr.includes('[native code]')) return true;
        }
      }
      if (window.chrome.runtime && window.chrome.runtime.connect) {
        try {
          window.chrome.runtime.connect({ name: '__bot_detect_probe__' });
        } catch (error) {
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  function detectDevTools() {
    return new Promise((resolve) => {
      const workerCode = `
        onmessage = function() {
          postMessage("before");
          debugger;
          postMessage("after");
        };
      `;
      try {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);
        let startTime;
        let resolved = false;

        worker.onmessage = function (event) {
          if (event.data === 'before') {
            startTime = performance.now();
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                worker.terminate();
                URL.revokeObjectURL(url);
                resolve(true);
              }
            }, 500);
          } else if (event.data === 'after') {
            if (!resolved) {
              resolved = true;
              const diff = performance.now() - startTime;
              worker.terminate();
              URL.revokeObjectURL(url);
              resolve(diff > 100);
            }
          }
        };

        worker.onerror = function () {
          if (!resolved) {
            resolved = true;
            URL.revokeObjectURL(url);
            resolve(false);
          }
        };

        worker.postMessage('');
      } catch (error) {
        resolve(false);
      }
    });
  }

  function detectDevToolsByConsole() {
    let accessed = false;
    try {
      const err = new window.Error();
      Object.defineProperty(err, 'stack', {
        configurable: false,
        enumerable: false,
        get: function () {
          accessed = true;
          return '';
        },
      });
      window.console.debug(err);
    } catch (error) {
    }
    return accessed;
  }

  function detectNavigatorTampered() {
    const results = {};
    let anyTampered = false;

    const allProps = new Set();
    let proto = window.navigator;
    do {
      Object.getOwnPropertyNames(proto).forEach((prop) => {
        if (prop !== 'hasOwnProperty') allProps.add(prop);
      });
    } while ((proto = Object.getPrototypeOf(proto)));

    for (const prop of allProps) {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, prop)
          || Object.getOwnPropertyDescriptor(navigator, prop);
        if (!descriptor) continue;

        const fn = descriptor.get || descriptor.value;
        if (typeof fn !== 'function') continue;

        const fnString = Function.prototype.toString.call(fn);
        const native = fnString.includes('[native code]');
        results[prop] = { native, value: navigator[prop] };
        if (!native) anyTampered = true;
      } catch (error) {
      }
    }

    return { tampered: anyTampered, details: results };
  }

  const BOT_PATTERNS = [
    /bot/i, /crawl/i, /spider/i, /slurp/i, /search/i,
    /headlesschrome/i, /phantomjs/i, /selenium/i, /webdriver/i,
    /python/i, /wget/i, /curl/i, /axios/i, /postman/i,
    /java(?!;)/i, /library/i, /archive/i, /monitor/i,
    /scan/i, /scrape/i, /preview/i, /proxy/i, /feed/i,
    /download/i, /check/i, /http/i, /capture/i,
    /^mozilla\/\d\.\d\s*$/i, /^mozilla\/\d\.\d\s+\w+$/i,
    /^$/,
  ];

  function detectBotUA(ua) {
    if (!ua) return true;
    return BOT_PATTERNS.some((pattern) => pattern.test(ua));
  }

  function createCard(id, name) {
    const card = document.createElement('div');
    card.className = 'card detecting';
    card.id = 'card-' + id;
    card.innerHTML = `
      <div class="card-header">
        <div class="dot detecting" id="dot-${id}"></div>
        <div class="card-name">${name}</div>
      </div>
      <div class="card-value" id="val-${id}">检测中...</div>
    `;
    return card;
  }

  function updateCard(id, detected, valueText) {
    const card = document.getElementById('card-' + id);
    const dot = document.getElementById('dot-' + id);
    const val = document.getElementById('val-' + id);
    if (!card || !dot || !val) return;
    card.className = 'card ' + (detected ? 'fail' : 'pass');
    dot.className = 'dot ' + (detected ? 'fail' : 'pass');
    val.className = 'card-value' + (detected ? ' detected' : '');
    val.textContent = valueText;
  }

  const webdriverItems = [
    ['webdriver', 'navigator.webdriver'],
    ['webdriver_adv', 'WebDriver 高级（全局变量注入）'],
    ['selenium', 'SlimerJS / Triflejs'],
    ['nightmare', 'NightmareJS'],
    ['phantomjs', 'PhantomJS'],
    ['awesomium', 'Awesomium'],
    ['cef', 'CEF (Chromium Embedded)'],
    ['coachjs', 'CoachJS (emit)'],
    ['fminer', 'FMiner (fmget_target)'],
    ['sequentum', 'Sequentum'],
    ['geb', 'Geb / Watir'],
    ['phantomas', 'Phantomas (Buffer)'],
    ['rhino', 'Rhino / Node (spawn)'],
    ['webdriverio', 'WebDriverIO / BAS'],
    ['headless_chrome', 'Headless Chrome（综合）'],
  ];

  const cdpItems = [
    ['cdp', 'CDP (chrome 对象异常)'],
    ['devtools', 'DevTools 打开（Worker debugger 延迟/超时）'],
    ['devtools_con', 'DevTools 打开（console.debug Error.stack 访问）'],
  ];

  const gridWD = document.getElementById('grid-webdriver');
  const gridCDP = document.getElementById('grid-cdp');
  const gridNav = document.getElementById('grid-navigator');
  const gridUA = document.getElementById('grid-ua');

  webdriverItems.forEach(([id, name]) => gridWD.appendChild(createCard(id, name)));
  cdpItems.forEach(([id, name]) => gridCDP.appendChild(createCard(id, name)));
  gridNav.appendChild(createCard('navigator', 'Navigator 属性原生性'));
  gridUA.appendChild(createCard('useragent', `User-Agent: ${navigator.userAgent.slice(0, 60)}...`));

  async function runDetection() {
    let overallBot = false;

    const wdResults = [
      detectWebdriver(),
      detectWebdriverAdvance(),
      detectSelenium(),
      detectNightmareJS(),
      detectPhantomJS(),
      detectAwesomium(),
      detectCEF(),
      detectCEFSharp(),
      detectCoachJS(),
      detectFMiner(),
      detectGeb(),
      detectPhantomas(),
      detectRhino(),
      detectWebdriverIO(),
      detectHeadlessChrome(),
    ];

    webdriverItems.forEach(([id], i) => {
      const bot = wdResults[i];
      if (bot) overallBot = true;
      updateCard(id, bot, bot ? '⚠ 检测到 Robot 特征' : '✓ 正常');
    });

    const cdpBot = detectCDP();
    if (cdpBot) overallBot = true;
    updateCard('cdp', cdpBot, cdpBot ? '⚠ CDP 注入检测到' : '✓ 正常');

    const consoleBot = detectDevToolsByConsole();
    if (consoleBot) overallBot = true;
    updateCard('devtools_con', consoleBot, consoleBot ? '⚠ DevTools 已打开（console.debug 触发 stack getter）' : '✓ DevTools 未检测到');

    updateCard('devtools', false, '检测中（异步）...');

    const navResult = detectNavigatorTampered();
    if (navResult.tampered) overallBot = true;
    const tamperedProps = Object.entries(navResult.details)
      .filter(([, value]) => !value.native)
      .map(([key]) => key);

    updateCard(
      'navigator',
      navResult.tampered,
      navResult.tampered
        ? `⚠ 篡改属性: ${tamperedProps.join(', ')}`
        : '✓ 所有属性均为原生实现'
    );

    const ua = navigator.userAgent;
    const uaBot = detectBotUA(ua);
    if (uaBot) overallBot = true;
    updateCard('useragent', uaBot, uaBot ? `⚠ UA 匹配 bot 特征: ${ua.slice(0, 80)}` : `✓ 正常: ${ua.slice(0, 80)}`);

    updateSummary(overallBot, false);

    const devtoolsBot = await detectDevTools();
    if (devtoolsBot) overallBot = true;
    updateCard('devtools', devtoolsBot, devtoolsBot ? '⚠ DevTools 已打开（debugger 暂停超时/延迟 >100ms）' : '✓ DevTools 未检测到');
    document.getElementById('async-note').textContent = 'DevTools 检测完成。';

    updateSummary(overallBot, true);
  }

  function updateSummary(isBot, final) {
    const icon = document.getElementById('summary-icon');
    const verdict = document.getElementById('summary-verdict');
    if (!icon || !verdict) {
      return;
    }
    if (!final) {
      verdict.textContent = isBot ? '⚠ 检测到 Robot 特征（最终结果待 DevTools 检测）' : '✓ 暂未发现异常（等待 DevTools 检测）';
      verdict.className = 'summary-verdict ' + (isBot ? 'verdict-fail' : 'verdict-pass');
      icon.textContent = isBot ? '🤖' : '⏳';
    } else {
      verdict.textContent = isBot ? 'Robot / 自动化环境' : '正常浏览器';
      verdict.className = 'summary-verdict ' + (isBot ? 'verdict-fail' : 'verdict-pass');
      icon.textContent = isBot ? '🤖' : '✅';
    }
  }

  runDetection();
})();
