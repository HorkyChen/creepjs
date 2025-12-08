Canvas 指纹检测逻辑主要位于 `src/canvas/index.ts` 文件中。该模块不仅生成 Canvas 指纹，还包含多种机制来检测浏览器是否通过随机化或欺骗手段（如指纹保护插件或隐私浏览器）篡改了 Canvas 数据。

以下是该模块的核心逻辑总结：

### 1. 核心功能概述
该模块通过在 HTML5 Canvas 上绘制复杂的图形、文本和表情符号，并读取生成的像素数据来创建唯一的指纹。同时，它通过比较不同操作下的读写一致性、检测已知的“谎言”（被篡改的方法）以及分析渲染噪音来判断用户是否开启了 Canvas 防护。

### 2. 主要组件与函数

#### 2.1 `getPixelMods()` - 像素噪音检测
此函数用于检测 Canvas 读取过程中是否存在随机噪音（这是许多指纹防御方案的典型特征）。
*   **原理**：
    1.  创建两个 Canvas 上下文。
    2.  在第一个 Canvas 上填充随机生成的像素点。
    3.  通过 `getImageData` 读取第一个 Canvas 的数据，并将其绘制到第二个 Canvas 上。
    4.  再次读取第二个 Canvas 的数据，并与原始数据进行逐像素比对。
    5.  **检测逻辑**：如果读取出的数据与写入的数据不一致（即 `pixelColor1 != pixelColor2`），则说明浏览器在读取或写入过程中注入了噪音。
*   **输出**：返回差异的像素数量 (`pixels`) 和受影响的 RGBA 通道 (`rgba`)。

#### 2.2 `paintCanvas()` - 复杂图形绘制
这是一个基于种子（Seed）的确定性绘图函数，灵感来自 `picasso-like-canvas-fingerprinting`。
*   **目的**：绘制一个包含多种几何形状、渐变和阴影的复杂场景，以最大化不同浏览器/硬件渲染堆栈之间的差异。
*   **绘制内容**：
    *   **随机渐变**：`createRadialGradient`。
    *   **文本描边**：绘制字符 "👾A" (`strokeText`)。
    *   **几何路径**：圆弧 (`arc`)、贝塞尔曲线 (`bezierCurveTo`)、二次曲线 (`quadraticCurveTo`)、椭圆 (`ellipse`)。
    *   **阴影与混合**：应用 `shadowBlur` 和 `shadowColor`。
*   **参数**：接受 `seed`、`offset`、`multiplier` 等参数以确保绘图过程的确定性。

#### 2.3 `getCanvas2d()` - 主执行逻辑
这是模块的入口函数，负责协调指纹生成和检测流程。

**A. 环境准备与谎言检测**
*   **Lie Detection**：检查 `HTMLCanvasElement` 和 `CanvasRenderingContext2D` 原型链上的关键方法（如 `toDataURL`, `getImageData`, `measureText`）是否被篡改（基于 `../lies` 模块）。
*   **双上下文创建**：
    *   `context`：标准 2D 上下文。
    *   `contextCPU`：配置了 `willReadFrequently: true` 和 `desynchronized: true` 的上下文，试图强制或模拟 CPU 渲染路径，以获取不同的指纹维度。

**B. 指纹生成步骤**
1.  **综合绘图 (Combined)**：调用 `paintCanvas` 绘制复杂场景并获取 `dataURI`。
2.  **像素噪音检测**：调用 `getPixelMods`。
3.  **TextMetrics 指纹**：
    *   使用 `measureText` 测量一系列 Emoji (`EMOJIS`)。
    *   收集边界框数据（Ascent, Descent, Left, Right 等）。
    *   计算 `textMetricsSystemSum` 作为指纹的一部分。
    *   **检测逻辑**：检查 `measureText` 返回的数值是否包含异常的浮点数噪音（`getTextMetricsFloatLie`），这也是一种常见的指纹混淆技术。
4.  **Paint 指纹 (GPU & CPU)**：
    *   分别在 `context` (GPU) 和 `contextCPU` (CPU) 上绘制几何图形并获取 `toDataURL`。这有助于区分硬件加速对渲染的影响。
5.  **文本与 Emoji 指纹**：
    *   单独绘制字符 "A" 和 Emoji "👾" 并获取图像数据。

**C. 篡改与低熵检测**
*   **篡改判定**：如果 `getPixelMods` 发现像素差异，或者 `getImageData` 返回的数据存在统计学上的异常，标记为 `lied`。
*   **低熵图像检测 (Low Entropy)**：
    *   绘制一个极简的图形（黑色背景上的一个白点和一个圆）。
    *   读取数据并与已知的“白名单”哈希（Blink, Gecko, WebKit 引擎在纯净状态下的已知渲染结果）进行比对。
    *   如果结果是已知的“假”图像（通常由隐私插件返回的空白或固定图像），则标记 `LowerEntropy.CANVAS` 为 `true`，并将其视为“可疑像素数据”。

### 3. 数据输出 (`canvasHTML`)
最后，模块将收集到的数据格式化为 HTML 展示：
*   **Hash 值**：展示 DataURI、TextURI、EmojiURI、PaintURI 等的哈希值。
*   **可视化**：直接在页面上展示生成的 Canvas 图像，方便用户肉眼比对。
*   **噪音展示**：如果检测到 RGBA 通道噪音，会高亮显示受影响的颜色通道（如 `rgba noise: r, g, b`）。
*   **TextMetrics**：展示 Emoji 测量的总和及支持的 Emoji 集合。

### 总结
CreepJS 的 Canvas 模块不仅仅是生成一个哈希，它更侧重于**完整性验证**。它通过对比 CPU/GPU 渲染差异、检测读写一致性（噪音注入）、验证测量数据的精度以及识别已知的“假”渲染结果，来构建一个高可信度的指纹，并能有效识别出试图隐藏指纹的用户。
