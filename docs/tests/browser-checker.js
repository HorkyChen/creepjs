(async () => {
  const hashMini = x => {
    if (!x) return x
    const json = `${JSON.stringify(x)}`
    const hash = json.split('').reduce((hash, char, i) => {
      return Math.imul(31, hash) + json.charCodeAt(i) | 0
    }, 0x811c9dc5)
    return ('0000000' + (hash >>> 0).toString(16)).substr(-8)
  }

  // template views
  const patch = (oldEl, newEl) => oldEl.parentNode.replaceChild(newEl, oldEl)
  const html = (str, ...expressionSet) => {
    const template = document.createElement('template')
    template.innerHTML = str.map((s, i) => `${s}${expressionSet[i] || ''}`).join('')
    return document.importNode(template.content, true)
  }

  const note = {
    unsupported: '<span class="blocked">unsupported</span>',
    blocked: '<span class="blocked">blocked</span>',
    lied: '<span class="lies">lied</span>',
    match: '<span class="high-entropy">✓ match</span>',
    mismatch: '<span class="lies">✗ mismatch</span>'
  }

  // Chrome 120-134 版本检测逻辑
  const versionFeatures = {
    134: {
      name: 'Chrome 134',
      features: {
        'shared-storage-batch': {
          name: 'Shared Storage batchUpdate',
          check: () => typeof sharedStorage !== 'undefined' && 'batchUpdate' in sharedStorage,
          description: 'Shared Storage 批量更新 API'
        },
        'image-smoothing-quality': {
          name: 'Canvas imageSmoothingQuality',
          check: () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            return ctx && 'imageSmoothingQuality' in ctx
          },
          description: 'Canvas 图像平滑质量控制'
        }
      }
    },
    133: {
      name: 'Chrome 133',
      features: {
        'text-box-trim': {
          name: 'CSS text-box-trim',
          check: () => CSS.supports('text-box-trim', 'both'),
          description: 'CSS 文本框裁剪'
        },
        'animation-overall-progress': {
          name: 'Animation.overallProgress',
          check: () => 'overallProgress' in Animation.prototype,
          description: '动画整体进度属性'
        }
      }
    },
    132: {
      name: 'Chrome 132',
      features: {
        'request-bytes': {
          name: 'Request.bytes()',
          check: () => 'bytes' in Request.prototype,
          description: 'Request 的 bytes() 方法'
        },
        'dialog-toggle-event': {
          name: 'Dialog ToggleEvent',
          check: () => 'ToggleEvent' in window && 'ontoggle' in document.createElement('dialog'),
          description: 'Dialog 切换事件'
        },
        'writing-mode-sideways': {
          name: 'CSS writing-mode sideways',
          check: () => CSS.supports('writing-mode', 'sideways-rl'),
          description: 'CSS 侧向书写模式'
        }
      }
    },
    131: {
      name: 'Chrome 131',
      features: {
        'details-content-pseudo': {
          name: '::details-content 伪元素',
          check: () => CSS.supports('selector(::details-content)'),
          description: 'Details 内容伪元素'
        },
        'font-variant-emoji': {
          name: 'CSS font-variant-emoji',
          check: () => CSS.supports('font-variant-emoji', 'text'),
          description: 'Emoji 字体变体'
        }
      }
    },
    130: {
      name: 'Chrome 130',
      features: {
        'document-picture-in-picture': {
          name: 'Document Picture-in-Picture',
          check: () => 'documentPictureInPicture' in window,
          description: '文档画中画 API'
        },
        'box-decoration-break': {
          name: 'CSS box-decoration-break',
          check: () => CSS.supports('box-decoration-break', 'clone'),
          description: 'CSS 盒子装饰中断'
        }
      }
    },
    129: {
      name: 'Chrome 129',
      features: {
        'scheduler-yield': {
          name: 'scheduler.yield()',
          check: () => 'scheduler' in window && 'yield' in scheduler,
          description: '调度器让步方法'
        },
        'interpolate-size': {
          name: 'CSS interpolate-size',
          check: () => CSS.supports('interpolate-size', 'allow-keywords'),
          description: 'CSS 尺寸插值'
        },
        'calc-size': {
          name: 'CSS calc-size()',
          check: () => CSS.supports('width', 'calc-size(auto, size)'),
          description: 'CSS 尺寸计算函数'
        }
      }
    },
    128: {
      name: 'Chrome 128',
      features: {
        'promise-try': {
          name: 'Promise.try()',
          check: () => 'try' in Promise && typeof Promise.try === 'function',
          description: 'Promise try 方法'
        },
        'ruby-align': {
          name: 'CSS ruby-align',
          check: () => CSS.supports('ruby-align', 'space-between'),
          description: 'Ruby 对齐属性'
        },
        'pointer-device-properties': {
          name: 'PointerEvent.deviceProperties',
          check: () => 'deviceProperties' in PointerEvent.prototype,
          description: '指针设备属性'
        }
      }
    },
    127: {
      name: 'Chrome 127',
      features: {
        'font-size-adjust': {
          name: 'CSS font-size-adjust',
          check: () => CSS.supports('font-size-adjust', '0.5'),
          description: '字体大小调整'
        }
      }
    },
    126: {
      name: 'Chrome 126',
      features: {
        'geolocation-to-json': {
          name: 'GeolocationCoordinates.toJSON()',
          check: () => 'toJSON' in GeolocationCoordinates.prototype,
          description: '地理位置坐标 JSON 序列化'
        }
      }
    },
    125: {
      name: 'Chrome 125',
      features: {
        'anchor-positioning': {
          name: 'CSS Anchor Positioning',
          check: () => CSS.supports('anchor-name', '--test'),
          description: 'CSS 锚点定位'
        },
        'pressure-observer': {
          name: 'PressureObserver',
          check: () => 'PressureObserver' in window,
          description: '计算压力观察器'
        },
        'css-stepped-functions': {
          name: 'CSS round()/mod()',
          check: () => CSS.supports('width', 'round(10px, 5px)'),
          description: 'CSS 步进函数'
        }
      }
    },
    124: {
      name: 'Chrome 124',
      features: {
        'set-html-unsafe': {
          name: 'setHTMLUnsafe()',
          check: () => 'setHTMLUnsafe' in Element.prototype,
          description: '不安全 HTML 设置方法'
        },
        'websocket-stream': {
          name: 'WebSocketStream',
          check: () => 'WebSocketStream' in window,
          description: 'WebSocket 流 API'
        },
        'pageswap-event': {
          name: 'PageSwapEvent',
          check: () => 'PageSwapEvent' in window,
          description: '页面交换事件'
        }
      }
    },
    123: {
      name: 'Chrome 123',
      features: {
        'light-dark': {
          name: 'CSS light-dark()',
          check: () => CSS.supports('color', 'light-dark(white, black)'),
          description: 'CSS 明暗函数'
        },
        'long-animation-frames': {
          name: 'PerformanceLongAnimationFrameTiming',
          check: () => 'PerformanceLongAnimationFrameTiming' in window,
          description: '长动画帧 API'
        },
        'navigation-activation': {
          name: 'NavigationActivation',
          check: () => 'navigation' in window && 'activation' in navigation,
          description: '导航激活接口'
        }
      }
    },
    122: {
      name: 'Chrome 122',
      features: {
        'storage-buckets': {
          name: 'Storage Buckets API',
          check: () => 'storage' in navigator && 'createBucket' in navigator.storage,
          description: '存储桶 API'
        }
      }
    },
    121: {
      name: 'Chrome 121',
      features: {
        'scrollbar-color': {
          name: 'CSS scrollbar-color',
          check: () => CSS.supports('scrollbar-color', 'auto'),
          description: '滚动条颜色'
        },
        'scrollbar-width': {
          name: 'CSS scrollbar-width',
          check: () => CSS.supports('scrollbar-width', 'thin'),
          description: '滚动条宽度'
        },
        'spelling-error-pseudo': {
          name: '::spelling-error 伪元素',
          check: () => CSS.supports('selector(::spelling-error)'),
          description: '拼写错误伪元素'
        }
      }
    },
    120: {
      name: 'Chrome 120',
      features: {
        'close-watcher': {
          name: 'CloseWatcher',
          check: () => 'CloseWatcher' in window,
          description: '关闭观察器 API'
        },
        'details-name': {
          name: '<details> name 属性',
          check: () => 'name' in document.createElement('details'),
          description: 'Details 元素名称属性'
        }
      }
    }
  }

  // 检测 Chrome 版本
  function detectChromeVersion() {
    console.log('=== Browser Checker: Starting version detection ===')
    const allResults = {}
    
    // 检测所有版本的特性
    for (let version = 134; version >= 120; version--) {
      const versionData = versionFeatures[version]
      if (!versionData) continue

      const features = versionData.features
      const results = {}
      let supported = 0
      let total = 0

      console.log(`\nChecking Chrome ${version}:`)
      
      for (const [key, feature] of Object.entries(features)) {
        total++
        try {
          const isSupported = feature.check()
          results[key] = isSupported
          if (isSupported) supported++
          
          console.log(`  ${feature.name}: ${isSupported ? '✓' : '✗'}`)
        } catch (e) {
          results[key] = false
          console.log(`  ${feature.name}: ✗ (${e.message})`)
        }
      }

      const confidence = (supported / total * 100).toFixed(1)
      console.log(`  Result: ${supported}/${total} features, confidence: ${confidence}%`)
      
      allResults[version] = {
        version: version,
        name: versionData.name,
        features: results,
        supported: supported,
        total: total,
        confidence: confidence
      }
    }

    // 找到支持特性最多的版本
    console.log('\n=== Analyzing results ===')
    let detectedVersion = null
    
    for (let version = 134; version >= 120; version--) {
      const result = allResults[version]
      if (result && result.supported > 0) {
        const allSupported = result.supported === result.total
        console.log(`Chrome ${version}: ${result.supported}/${result.total} (${allSupported ? 'full match' : 'partial'})`)
        
        if (allSupported && !detectedVersion) {
          detectedVersion = result
          console.log(`  ✓ Selected`)
        }
      }
    }

    // 如果没有完全匹配，选择支持特性最多的版本
    if (!detectedVersion) {
      console.log('\nNo full match found, selecting highest support:')
      let maxSupported = 0
      
      for (let version = 134; version >= 120; version--) {
        const result = allResults[version]
        if (result && result.supported > maxSupported) {
          maxSupported = result.supported
          detectedVersion = result
        }
      }
      
      if (detectedVersion) {
        console.log(`Selected Chrome ${detectedVersion.version} (${detectedVersion.supported}/${detectedVersion.total})`)
      }
    }

    console.log('=== Detection complete ===\n')

    if (detectedVersion) {
      return detectedVersion
    }

    return {
      version: null,
      name: 'Unknown Version',
      features: {},
      confidence: 0
    }
  }

  // 从 User Agent 解析版本
  function parseUAVersion() {
    const ua = navigator.userAgent
    const match = ua.match(/Chrome\/(\d+)/)
    return match ? parseInt(match[1]) : null
  }

  // 主检测逻辑
  const start = performance.now()
  const detected = detectChromeVersion()
  const uaVersion = parseUAVersion()
  const perf = performance.now() - start

  console.log(`\nUA Version: Chrome ${uaVersion}`)
  console.log(`Detected Version: Chrome ${detected.version || 'Unknown'}`)
  console.log(`Confidence: ${detected.confidence}%`)
  console.log(`Match: ${uaVersion === detected.version}`)

  const el = document.getElementById('fingerprint-data')
  
  // 生成特性列表 HTML
  let featuresHTML = ''
  if (detected.version) {
    const versionData = versionFeatures[detected.version]
    for (const [key, feature] of Object.entries(versionData.features)) {
      const isSupported = detected.features[key]
      const statusClass = isSupported ? 'high-entropy' : 'blocked'
      const statusText = isSupported ? '✓ Supported' : '✗ Unsupported'
      featuresHTML += `
        <div>
          <strong>${feature.name}</strong>
          <div><span class="${statusClass}">${statusText}</span></div>
          <div class="small">${feature.description}</div>
        </div>
      `
    }
  } else {
    featuresHTML = '<div>No Chrome 120+ features detected</div>'
  }

  // 生成所有版本检测摘要
  let versionSummaryHTML = '<div style="font-size: 12px !important;">'
  for (let version = 134; version >= 120; version--) {
    const result = detectChromeVersion.allResults?.[version]
    if (result) {
      const className = result.supported === result.total ? 'high-entropy' : 
                       result.supported > 0 ? 'warn' : 'blocked'
      versionSummaryHTML += `
        <div style="margin: 2px 0;">
          Chrome ${version}: <span class="${className}">${result.supported}/${result.total} features</span>
        </div>
      `
    }
  }
  versionSummaryHTML += '</div>'

  // 判断匹配状态
  let matchStatus = note.unsupported
  let matchText = 'Version detection failed'
  
  if (detected.version) {
    if (uaVersion === detected.version) {
      matchStatus = note.match
      matchText = 'UA and feature detection match'
    } else {
      matchStatus = note.mismatch
      matchText = `Version mismatch! UA shows ${uaVersion}, detected ${detected.version}`
    }
  } else if (uaVersion) {
    matchStatus = note.blocked
    matchText = `Cannot detect (UA shows Chrome ${uaVersion}, likely < 120)`
  }

  patch(el, html`
  <div id="fingerprint-data">
    <div>
      <strong>Browser Version Checker</strong>
      <div>Detection Time: <span class="time">${perf.toFixed(2)} ms</span></div>
      <div class="relative">
        <div class="ellipsis-all">
          User Agent Version: <strong>Chrome ${uaVersion || 'Unknown'}</strong>
        </div>
      </div>
      <div class="relative">
        <div class="ellipsis-all">
          Detected Version: <strong>${detected.version ? detected.name : 'Unknown (< Chrome 120)'}</strong>
        </div>
      </div>
      <div class="relative">
        <div class="ellipsis-all">
          Confidence: <strong>${detected.confidence}%</strong>
        </div>
      </div>
      <div class="relative">
        <div class="ellipsis-all">
          Match Status: ${matchStatus}
        </div>
        <div class="small" style="margin-top: 5px;">${matchText}</div>
      </div>
    </div>

    <div class="relative">
      <strong>Detected Features</strong>
      <div>Feature detection for ${detected.version ? detected.name : 'Chrome 120-134'}</div>
      <div style="margin-top: 10px;">
        ${featuresHTML}
      </div>
    </div>

    <div class="relative">
      <strong>User Agent</strong>
      <div class="block-text">
        <div style="font-size: 11px !important; word-break: break-all;">
          ${navigator.userAgent}
        </div>
      </div>
    </div>

    <div class="relative">
      <strong>Detection Details</strong>
      <div class="small" style="margin-top: 10px;">
        <div>This checker uses feature detection to identify the actual Chrome version.</div>
        <div style="margin-top: 5px;">It checks for APIs and CSS features introduced in Chrome 120-134.</div>
        <div style="margin-top: 5px;">Data sources: Chrome Platform Status & Chrome Developer Blog</div>
        <div style="margin-top: 5px;">Last updated: 2025-12-11</div>
      </div>
    </div>
  </div>
  `)

})()
