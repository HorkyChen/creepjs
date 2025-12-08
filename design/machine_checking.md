# CreepJS机器指纹测试结果收集器

## 概述

`MachineVerifier` 类专门用于访问 CreepJS 机器指纹测试页面 (https://abrahamjuliot.github.io/creepjs/tests/machine.html)，并收集页面输出的测试结果。该工具专注于获取 CreepJS 自身的检测结果，不进行额外的设备信息采集。

## 功能特性

### 1. 自动化测试流程
- 自动打开 CreepJS 机器测试页面
- 等待页面完全加载和所有测试完成
- 智能等待测试结果加载完毕

### 2. CreepJS结果收集
- **原始数据**: 收集 CreepJS 的全局对象和指纹数据
- **页面内容**: 提取页面上显示的所有测试结果
- **结构化数据**: 自动识别表格、列表等结构化内容
- **有意义内容**: 过滤并提取包含检测信息的文本行

### 3. 智能结果分类
- 根据内容关键词自动判断测试状态（成功/失败/警告）
- 支持多种结果状态和详细分类
- 包含完整的元数据和时间戳信息

## 使用方法

### 基本用法

```python
from machine.machine_verifier import MachineVerifier

# 创建验证器实例
verifier = MachineVerifier(task_id="test_001", env_id="default")

# 获取CreepJS测试结果
results = verifier.get_test_results()

# 查看结果摘要
if results:
    print(f"总计测试项: {results['total_count']}")
    print(f"成功: {results['passed_count']}")
    print(f"失败: {results['failed_count']}")
    print(f"警告: {results['warning_count']}")
```

### 获取CreepJS原始数据

```python
success_items = results.get('success_items', {})

# 获取CreepJS的原始对象和指纹数据
creepjs_data = {k: v for k, v in success_items.items() if k.startswith('creepjs_')}
for key, value in creepjs_data.items():
    print(f"{key}: {value}")
```

### 获取有意义的检测内容

```python
# 获取页面上有意义的检测信息行
meaningful_content = success_items.get('creepjs_meaningful_content', [])
for line in meaningful_content:
    print(f"检测信息: {line}")
```

## 收集的数据类型

### CreepJS原始数据
- `creepjs_creep_object`: CreepJS的主要对象数据
- `creepjs_fingerprint`: CreepJS生成的指纹信息

### 页面测试元素
- `test_[TAG]_[INDEX]`: 页面上的各个测试元素结果
- 根据内容自动分类为成功、失败或警告状态

### 结构化数据
- `structured_table_*`: 页面上的表格数据
- `structured_list_*`: 页面上的列表数据

### 有意义内容
- `creepjs_meaningful_content`: 包含检测信息的文本行（过滤后）

## 结果状态判断

系统根据内容关键词自动判断测试状态：

- **成功 (Success)**: 包含 "detected", "found", "supported", "available", "enabled", "true", "passed" 等关键词
- **失败 (Failed)**: 包含 "error", "failed", "blocked", "denied", "false" 等关键词
- **警告 (Warning)**: 包含有用信息但无法明确判断状态的内容

## 配置说明

### 等待时间设置
- 页面加载等待: 30秒
- CreepJS测试完成等待: 10秒
- 智能内容加载检测: 30秒

### 数据限制
- 提取元素数量: 最多50个
- 有意义内容行数: 最多20行
- 单个文本长度: 最多1000字符

## 依赖要求

- Python 3.7+
- Playwright (用于浏览器自动化)
- asyncio (异步编程支持)
- 有效的 WebBrowser 环境

## 使用示例

### 完整测试流程

```python
#!/usr/bin/env python3
import logging
from machine.machine_verifier import MachineVerifier

# 设置日志
logging.basicConfig(level=logging.INFO)

# 执行测试
verifier = MachineVerifier(task_id="demo", env_id="test_env")
results = verifier.get_test_results()

# 分析结果
if results:
    # 显示基本统计
    print(f"测试完成: {results['total_count']} 项")
    print(f"成功率: {(results['passed_count']/results['total_count']*100):.1f}%")

    # 获取CreepJS数据
    success_items = results['success_items']
    if 'creepjs_creep_object' in success_items:
        print(f"CreepJS对象: {success_items['creepjs_creep_object']}")

    # 显示检测内容
    meaningful = success_items.get('creepjs_meaningful_content', [])
    print(f"检测到 {len(meaningful)} 项有意义内容")
    for content in meaningful[:5]:  # 显示前5项
        print(f"  - {content}")
```

## 错误处理

系统包含完整的错误处理机制：

- **网络错误**: 页面无法访问时记录错误
- **加载超时**: 页面加载超时时继续收集已有结果
- **JavaScript错误**: JS执行失败时记录警告
- **数据解析错误**: 解析失败的内容记录为失败项

所有错误都会记录在结果中，便于问题诊断。

## 快速测试

运行测试脚本验证功能：

```bash
python run_machine_verification.py
```

该脚本会执行完整的CreepJS检测流程并显示详细的结果分析。

## 注意事项

1. **网络要求**: 需要能够访问 https://abrahamjuliot.github.io
2. **浏览器环境**: 确保 WebBrowser 类能正确创建浏览器实例
3. **测试时间**: 完整测试大约需要 30-60 秒
4. **结果变化**: CreepJS结果可能因浏览器配置和版本而异
5. **反检测**: 某些反指纹技术可能影响检测结果

## 扩展功能

如需自定义结果处理：

```python
# 获取Results对象
verifier = MachineVerifier(task_id="test", env_id="env")
results_obj = verifier.test_results

# 自定义分析
summary = results_obj.get_summary()
json_export = results_obj.to_json()

# 添加自定义数据
results_obj.add_metadata("custom_info", "additional_data")
```