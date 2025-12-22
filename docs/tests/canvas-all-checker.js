(async () => {
  /**
   * 计算 SHA-256 哈希值
   * @param {string} str - 要哈希的字符串
   * @returns {Promise<string>} 哈希值的十六进制字符串
   */
  async function hashSHA256(str) {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  /**
   * 创建一个测试canvas并执行绘图API
   * @param {Function} drawFunc - 绘图函数
   * @returns {Object} 包含canvas元素和哈希值
   */
  async function createTestCanvas(drawFunc) {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 50
    canvas.className = 'canvas-display'

    const ctx = canvas.getContext('2d')

    // 执行绘图函数
    drawFunc(ctx, canvas)

    // 获取toDataURL哈希
    const dataURL = canvas.toDataURL()
    const dataURLHash = await hashSHA256(dataURL)

    // 获取getImageData哈希
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const imageDataStr = Array.from(imageData.data).join(',')
    const imageDataHash = await hashSHA256(imageDataStr)

    return {
      canvas,
      dataURLHash,
      imageDataHash
    }
  }

  // Canvas 2D API 测试列表
  const apiTests = [
    {
      title: 'fillRect - 填充矩形',
      draw: (ctx) => {
        ctx.fillStyle = '#FF6633'
        ctx.fillRect(10, 10, 80, 30)
      }
    },
    {
      title: 'strokeRect - 描边矩形',
      draw: (ctx) => {
        ctx.strokeStyle = '#3366E6'
        ctx.lineWidth = 2
        ctx.strokeRect(10, 10, 80, 30)
      }
    },
    {
      title: 'fillText - 填充文本',
      draw: (ctx) => {
        ctx.font = '20px Arial'
        ctx.fillStyle = '#000000'
        ctx.fillText('Canvas', 10, 30)
      }
    },
    {
      title: 'strokeText - 描边文本',
      draw: (ctx) => {
        ctx.font = '20px Arial'
        ctx.strokeStyle = '#FF0000'
        ctx.lineWidth = 1
        ctx.strokeText('Test', 10, 30)
      }
    },
    {
      title: 'arc - 圆弧',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.arc(50, 25, 20, 0, Math.PI * 2)
        ctx.fillStyle = '#00B3E6'
        ctx.fill()
      }
    },
    {
      title: 'arcTo - 圆弧到',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.moveTo(10, 10)
        ctx.arcTo(90, 10, 90, 40, 10)
        ctx.strokeStyle = '#E6B333'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    },
    {
      title: 'ellipse - 椭圆',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.ellipse(50, 25, 40, 15, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#99FF99'
        ctx.fill()
      }
    },
    {
      title: 'bezierCurveTo - 三次贝塞尔曲线',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.moveTo(10, 40)
        ctx.bezierCurveTo(20, 10, 80, 10, 90, 40)
        ctx.strokeStyle = '#FF33FF'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    },
    {
      title: 'quadraticCurveTo - 二次贝塞尔曲线',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.moveTo(10, 40)
        ctx.quadraticCurveTo(50, 10, 90, 40)
        ctx.strokeStyle = '#FFFF99'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    },
    {
      title: 'lineTo - 直线',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.moveTo(10, 10)
        ctx.lineTo(90, 40)
        ctx.strokeStyle = '#80B300'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    },
    {
      title: 'rect - 矩形路径',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.rect(10, 10, 80, 30)
        ctx.strokeStyle = '#809900'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    },
    {
      title: 'clearRect - 清除矩形',
      draw: (ctx) => {
        ctx.fillStyle = '#E6B3B3'
        ctx.fillRect(0, 0, 100, 50)
        ctx.clearRect(20, 15, 60, 20)
      }
    },
    {
      title: 'createLinearGradient - 线性渐变',
      draw: (ctx) => {
        const gradient = ctx.createLinearGradient(0, 0, 100, 0)
        gradient.addColorStop(0, '#6680B3')
        gradient.addColorStop(1, '#FF99E6')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 100, 50)
      }
    },
    {
      title: 'createRadialGradient - 径向渐变',
      draw: (ctx) => {
        const gradient = ctx.createRadialGradient(50, 25, 5, 50, 25, 30)
        gradient.addColorStop(0, '#CCFF1A')
        gradient.addColorStop(1, '#FF1A66')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 100, 50)
      }
    },
    {
      title: 'createPattern - 图案',
      draw: (ctx, canvas) => {
        const patternCanvas = document.createElement('canvas')
        patternCanvas.width = 10
        patternCanvas.height = 10
        const pCtx = patternCanvas.getContext('2d')
        pCtx.fillStyle = '#E6331A'
        pCtx.fillRect(0, 0, 5, 5)
        pCtx.fillStyle = '#33FFCC'
        pCtx.fillRect(5, 5, 5, 5)
        const pattern = ctx.createPattern(patternCanvas, 'repeat')
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, 100, 50)
      }
    },
    {
      title: 'rotate - 旋转',
      draw: (ctx) => {
        ctx.save()
        ctx.translate(50, 25)
        ctx.rotate(Math.PI / 4)
        ctx.fillStyle = '#66994D'
        ctx.fillRect(-20, -10, 40, 20)
        ctx.restore()
      }
    },
    {
      title: 'scale - 缩放',
      draw: (ctx) => {
        ctx.save()
        ctx.scale(2, 1.5)
        ctx.fillStyle = '#B366CC'
        ctx.fillRect(10, 5, 30, 15)
        ctx.restore()
      }
    },
    {
      title: 'translate - 平移',
      draw: (ctx) => {
        ctx.save()
        ctx.translate(30, 15)
        ctx.fillStyle = '#4D8000'
        ctx.fillRect(0, 0, 40, 20)
        ctx.restore()
      }
    },
    {
      title: 'transform - 变换矩阵',
      draw: (ctx) => {
        ctx.save()
        ctx.transform(1, 0.5, -0.5, 1, 30, 10)
        ctx.fillStyle = '#B33300'
        ctx.fillRect(0, 0, 40, 20)
        ctx.restore()
      }
    },
    {
      title: 'setTransform - 设置变换矩阵',
      draw: (ctx) => {
        ctx.setTransform(1.5, 0, 0, 1.5, 20, 10)
        ctx.fillStyle = '#CC80CC'
        ctx.fillRect(0, 0, 30, 15)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
      }
    },
    {
      title: 'clip - 裁剪',
      draw: (ctx) => {
        ctx.beginPath()
        ctx.arc(50, 25, 20, 0, Math.PI * 2)
        ctx.clip()
        ctx.fillStyle = '#66664D'
        ctx.fillRect(0, 0, 100, 50)
      }
    },
    {
      title: 'shadowBlur - 阴影模糊',
      draw: (ctx) => {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 5
        ctx.shadowOffsetY = 5
        ctx.fillStyle = '#991AFF'
        ctx.fillRect(20, 10, 40, 20)
      }
    },
    {
      title: 'globalAlpha - 全局透明度',
      draw: (ctx) => {
        ctx.fillStyle = '#E666FF'
        ctx.fillRect(10, 10, 40, 30)
        ctx.globalAlpha = 0.5
        ctx.fillStyle = '#4DB3FF'
        ctx.fillRect(30, 15, 40, 30)
        ctx.globalAlpha = 1.0
      }
    },
    {
      title: 'globalCompositeOperation - 合成操作',
      draw: (ctx) => {
        ctx.fillStyle = '#1AB399'
        ctx.fillRect(10, 10, 40, 30)
        ctx.globalCompositeOperation = 'xor'
        ctx.fillStyle = '#E666B3'
        ctx.fillRect(30, 15, 40, 30)
        ctx.globalCompositeOperation = 'source-over'
      }
    },
    {
      title: 'putImageData - 放置图像数据',
      draw: (ctx) => {
        const imageData = ctx.createImageData(50, 30)
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = Math.random() * 255
          imageData.data[i + 1] = Math.random() * 255
          imageData.data[i + 2] = Math.random() * 255
          imageData.data[i + 3] = 255
        }
        ctx.putImageData(imageData, 25, 10)
      }
    },
    {
      title: 'drawImage - 绘制图像',
      draw: (ctx) => {
        const img = document.createElement('canvas')
        img.width = 30
        img.height = 30
        const imgCtx = img.getContext('2d')
        imgCtx.fillStyle = '#33991A'
        imgCtx.fillRect(0, 0, 30, 30)
        imgCtx.fillStyle = '#CC9999'
        imgCtx.arc(15, 15, 10, 0, Math.PI * 2)
        imgCtx.fill()
        ctx.drawImage(img, 35, 10)
      }
    },
    {
      title: 'measureText - 测量文本',
      draw: (ctx) => {
        ctx.font = '16px Arial'
        const text = 'Measure'
        const metrics = ctx.measureText(text)
        ctx.fillStyle = '#B3B31A'
        ctx.fillRect(10, 20, metrics.width, 16)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(text, 10, 32)
      }
    }
  ]

  // 执行所有测试
  const start = performance.now()
  const results = []

  for (const test of apiTests) {
    const result = await createTestCanvas(test.draw)
    results.push({
      title: test.title,
      ...result
    })
  }

  const perf = performance.now() - start

  // 生成HTML
  const container = document.getElementById('fingerprint-data')

  // 创建头部
  const header = document.createElement('div')
  header.innerHTML = `
    <div style="margin-bottom: 20px;">
      <strong style="font-size: 24px;">All Canvas API Checking</strong>
      <div style="margin-top: 10px;">
        <span>测试数量: <strong>${apiTests.length}</strong> 个API</span> |
        <span>检测时间: <strong class="time">${perf.toFixed(2)} ms</strong></span>
      </div>
      <div style="margin-top: 10px;">
        <a href="canvas-checker.html" style="color: #3366E6;">← 返回 Canvas Checker</a>
      </div>
    </div>
  `
  container.appendChild(header)

  // 创建测试结果
  for (const result of results) {
    const item = document.createElement('div')
    item.className = 'canvas-test-item'

    const title = document.createElement('div')
    title.className = 'canvas-test-title'
    title.textContent = result.title
    item.appendChild(title)

    item.appendChild(result.canvas)

    const hashInfo = document.createElement('div')
    hashInfo.style.marginTop = '10px'
    hashInfo.innerHTML = `
      <div class="hash-display">
        <span>toDataURL Hash:</span><br>
        <strong>${result.dataURLHash}</strong>
      </div>
      <div class="hash-display" style="margin-top: 5px;">
        <span>getImageData Hash:</span><br>
        <strong>${result.imageDataHash}</strong>
      </div>
    `
    item.appendChild(hashInfo)

    container.appendChild(item)
  }

  console.log(`All Canvas API Checking completed in ${perf.toFixed(2)}ms`)
})()
