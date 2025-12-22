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
    match: '<span class="high-entropy">✓ 正常</span>',
    mismatch: '<span class="lies">✗ 篡改</span>'
  }

  // 定义颜色配置
  const colors = {
    black: { name: '黑色', rgb: [0, 0, 0, 255] },
    white: { name: '白色', rgb: [255, 255, 255, 255] },
    red: { name: '红色', rgb: [255, 0, 0, 255] },
    blue: { name: '蓝色', rgb: [0, 0, 255, 255] },
    green: { name: '绿色', rgb: [0, 255, 0, 255] },
    gradient: { name: '渐进色', type: 'gradient' }  // 特殊类型:渐进色
  }

  /**
   * 创建指定颜色的 canvas (纯色或渐进色)
   * @param {string} colorKey - 颜色键名 (black/white/red/blue/green/gradient)
   * @returns {HTMLCanvasElement}
   */
  function createSolidCanvas(colorKey) {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100

    const ctx = canvas.getContext('2d')
    const color = colors[colorKey]

    // 如果是渐进色,使用像素级绘制
    if (color.type === 'gradient') {
      const imageData = ctx.createImageData(100, 100)
      const data = imageData.data
      const totalPixels = 100 * 100

      // 为每个像素设置递增的 RGB 值
      for (let i = 0; i < totalPixels; i++) {
        const pixelIndex = i * 4
        // RGB 值在 0-255 之间线性递增
        const value = Math.floor(i * 256 / totalPixels)
        data[pixelIndex] = value      // R
        data[pixelIndex + 1] = value  // G
        data[pixelIndex + 2] = value  // B
        data[pixelIndex + 3] = 255    // A
      }

      ctx.putImageData(imageData, 0, 0)
    } else {
      // 填充纯色
      ctx.fillStyle = `rgb(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`
      ctx.fillRect(0, 0, 100, 100)
    }

    return canvas
  }

  /**
   * 验证 canvas 颜色是否被篡改
   * @param {HTMLCanvasElement} canvas - Canvas 元素
   * @param {string} colorKey - 预期颜色键名
   * @returns {Object} 包含验证结果和详细信息
   */
  function verifyCanvasColor(canvas, colorKey) {
    const ctx = canvas.getContext('2d')
    const color = colors[colorKey]

    // 读取所有像素数据
    const imageData = ctx.getImageData(0, 0, 100, 100)
    const pixels = imageData.data

    // 统计信息
    let totalPixels = 100 * 100
    let matchedPixels = 0
    let differentPixels = []

    // 渐进色的验证逻辑
    if (color.type === 'gradient') {
      for (let i = 0; i < totalPixels; i++) {
        const pixelIndex = i * 4
        const r = pixels[pixelIndex]
        const g = pixels[pixelIndex + 1]
        const b = pixels[pixelIndex + 2]
        const a = pixels[pixelIndex + 3]

        // 计算期望的 RGB 值
        const expectedValue = Math.floor(i * 256 / totalPixels)

        // 检查是否与预期值一致
        if (r === expectedValue && g === expectedValue && b === expectedValue && a === 255) {
          matchedPixels++
        } else {
          // 记录不一致的像素 (只记录前10个)
          if (differentPixels.length < 10) {
            const x = i % 100
            const y = Math.floor(i / 100)
            differentPixels.push({
              position: `(${x}, ${y})`,
              expected: `rgba(${expectedValue}, ${expectedValue}, ${expectedValue}, 255)`,
              actual: `rgba(${r}, ${g}, ${b}, ${a})`
            })
          }
        }
      }

      const matchRate = (matchedPixels / totalPixels * 100).toFixed(2)
      const isTampered = matchedPixels !== totalPixels

      return {
        isTampered,
        matchedPixels,
        totalPixels,
        matchRate,
        differentPixels,
        expectedColor: '渐进色 (0-255)',
        hash: hashMini(Array.from(pixels))
      }
    }

    // 纯色的验证逻辑
    const expectedColor = color.rgb
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const a = pixels[i + 3]

      // 检查是否与预期颜色一致
      if (r === expectedColor[0] &&
          g === expectedColor[1] &&
          b === expectedColor[2] &&
          a === expectedColor[3]) {
        matchedPixels++
      } else {
        // 记录不一致的像素 (只记录前10个)
        if (differentPixels.length < 10) {
          const pixelIndex = i / 4
          const x = pixelIndex % 100
          const y = Math.floor(pixelIndex / 100)
          differentPixels.push({
            position: `(${x}, ${y})`,
            expected: `rgba(${expectedColor.join(', ')})`,
            actual: `rgba(${r}, ${g}, ${b}, ${a})`
          })
        }
      }
    }

    const matchRate = (matchedPixels / totalPixels * 100).toFixed(2)
    const isTampered = matchedPixels !== totalPixels

    return {
      isTampered,
      matchedPixels,
      totalPixels,
      matchRate,
      differentPixels,
      expectedColor: `rgba(${expectedColor.join(', ')})`,
      hash: hashMini(Array.from(pixels))
    }
  }

  /**
   * 检查所有颜色
   */
  function checkAllColors() {
    const results = {}

    for (const colorKey in colors) {
      const canvas = createSolidCanvas(colorKey)
      const result = verifyCanvasColor(canvas, colorKey)
      results[colorKey] = {
        ...result,
        colorName: colors[colorKey].name,
        canvas: canvas  // 保存 canvas 元素用于显示
      }
    }

    return results
  }

  // 主检测逻辑
  console.log('=== Canvas Checker: Starting tampering detection ===')
  const start = performance.now()
  const results = checkAllColors()
  const perf = performance.now() - start

  // 统计总体结果
  let totalTests = Object.keys(results).length
  let passedTests = 0
  let tamperedTests = 0

  for (const colorKey in results) {
    const result = results[colorKey]
    console.log(`\n${result.colorName} Canvas:`)
    console.log(`  Status: ${result.isTampered ? '✗ 篡改' : '✓ 正常'}`)
    console.log(`  Match Rate: ${result.matchRate}%`)
    console.log(`  Matched Pixels: ${result.matchedPixels}/${result.totalPixels}`)
    console.log(`  Hash: ${result.hash}`)

    if (result.isTampered) {
      tamperedTests++
      console.log(`  Different Pixels (first ${result.differentPixels.length}):`)
      result.differentPixels.forEach(pixel => {
        console.log(`    ${pixel.position}: expected ${pixel.expected}, got ${pixel.actual}`)
      })
    } else {
      passedTests++
    }
  }

  console.log(`\n=== Detection complete: ${passedTests}/${totalTests} passed ===\n`)

  // 生成检测结果 HTML (先创建容器,稍后插入 canvas)
  const resultContainers = []
  for (const colorKey in results) {
    const result = results[colorKey]
    const statusClass = result.isTampered ? 'lies' : 'high-entropy'
    const statusText = result.isTampered ? '✗ 检测到篡改' : '✓ 正常'

    let detailsHTML = ''
    if (result.isTampered && result.differentPixels.length > 0) {
      detailsHTML = `
        <div class="small" style="margin-top: 5px;">
          <div>检测到 ${result.totalPixels - result.matchedPixels} 个像素不匹配:</div>
          ${result.differentPixels.map(pixel => `
            <div style="margin-left: 10px; font-size: 11px;">
              位置 ${pixel.position}: 期望 ${pixel.expected}, 实际 ${pixel.actual}
            </div>
          `).join('')}
          ${result.totalPixels - result.matchedPixels > result.differentPixels.length ?
            `<div style="margin-left: 10px; font-size: 11px;">... 还有 ${result.totalPixels - result.matchedPixels - result.differentPixels.length} 个不匹配像素</div>` : ''}
        </div>
      `
    }

    // 创建一个包含 canvas 占位符的容器
    const container = document.createElement('div')
    container.style.cssText = `margin: 10px 0; padding: 10px; border-left: 3px solid ${result.isTampered ? '#ca656e' : '#6bcd85'};`
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div id="canvas-container-${colorKey}" style="flex-shrink: 0;"></div>
        <div style="flex: 1;">
          <div><strong>${result.colorName}</strong></div>
          <div style="margin-top: 5px;">
            <span class="${statusClass}">${statusText}</span>
          </div>
          <div class="small" style="margin-top: 5px;">
            <div>匹配率: <strong>${result.matchRate}%</strong> (${result.matchedPixels}/${result.totalPixels} 像素)</div>
            <div>预期颜色: ${result.expectedColor}</div>
            <div>数据哈希: <span class="hash-like">${result.hash}</span></div>
          </div>
          ${detailsHTML}
        </div>
      </div>
    `

    resultContainers.push({ container, colorKey, canvas: result.canvas })
  }

  // 将所有容器合并成一个文档片段
  const resultsFragment = document.createDocumentFragment()
  resultContainers.forEach(item => resultsFragment.appendChild(item.container))

  // 判断总体状态
  let overallStatus = note.match
  let overallText = '所有 canvas 测试通过,未检测到篡改'

  if (tamperedTests > 0) {
    overallStatus = note.mismatch
    overallText = `检测到 ${tamperedTests}/${totalTests} 个 canvas 被篡改`
  }

  const el = document.getElementById('fingerprint-data')

  // 创建主容器
  const mainContainer = document.createElement('div')
  mainContainer.id = 'fingerprint-data'

  // 使用模板创建其他内容
  const otherContent = html`
    <div>
      <strong>Canvas 篡改检测器</strong>
      <div>检测时间: <span class="time">${perf.toFixed(2)} ms</span></div>
      <div class="relative">
        <div class="ellipsis-all">
          测试数量: <strong>${totalTests} 个颜色</strong>
        </div>
      </div>
      <div class="relative">
        <div class="ellipsis-all">
          通过: <strong class="high-entropy">${passedTests}</strong> /
          失败: <strong class="lies">${tamperedTests}</strong>
        </div>
      </div>
      <div class="relative">
        <div class="ellipsis-all">
          总体状态: ${overallStatus}
        </div>
        <div class="small" style="margin-top: 5px;">${overallText}</div>
      </div>
    </div>

    <div class="relative">
      <strong>检测结果详情</strong>
      <div id="results-container" style="margin-top: 10px;"></div>
    </div>

    <div class="relative">
      <strong>检测原理</strong>
      <div class="small" style="margin-top: 10px;">
        <div>• 创建 100x100 像素的测试 canvas</div>
        <div style="margin-top: 5px;">• 支持黑色、白色、红色、蓝色、绿色五种纯色 + 渐进色</div>
        <div style="margin-top: 5px;">• 渐进色:所有像素的 RGB 值从 0 递增到 255(灰度递增)</div>
        <div style="margin-top: 5px;">• 读取所有像素点的 RGBA 数据并验证</div>
        <div style="margin-top: 5px;">• 如果任何像素颜色不匹配,即判定为被篡改</div>
        <div style="margin-top: 5px;">• 常见篡改方式:Canvas 指纹保护插件、浏览器隐私模式修改</div>
      </div>
    </div>

    <div class="relative">
      <strong>技术说明</strong>
      <div class="small" style="margin-top: 10px;">
        <div>• Canvas 尺寸: 100 x 100 像素</div>
        <div style="margin-top: 5px;">• 像素总数: 10,000 像素</div>
        <div style="margin-top: 5px;">• 检测方法: getImageData() 全像素扫描</div>
        <div style="margin-top: 5px;">• 颜色格式: RGBA (8-bit per channel)</div>
        <div style="margin-top: 5px;">• 哈希算法: 32-bit FNV-1a</div>
      </div>
    </div>
  `

  // 将内容添加到主容器
  mainContainer.appendChild(otherContent)

  // 替换页面元素
  patch(el, mainContainer)

  // 渲染后,插入 canvas 元素和结果
  const resultsContainer = document.getElementById('results-container')
  if (resultsContainer) {
    resultsContainer.appendChild(resultsFragment)
  }

  // 将实际的 canvas 元素插入到各自的容器中
  resultContainers.forEach(item => {
    const canvasContainer = document.getElementById(`canvas-container-${item.colorKey}`)
    if (canvasContainer && item.canvas) {
      // 添加边框样式使 canvas 更明显
      item.canvas.style.cssText = 'border: 1px solid #ccc; display: block;'
      canvasContainer.appendChild(item.canvas)
    }
  })

  console.log('Canvas Checker UI rendered')

})()
