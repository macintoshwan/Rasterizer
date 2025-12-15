# Rasterizer

一个用于将矢量数据栅格化以供机器学习训练使用的Python库。

A Python library for rasterizing vector data for machine learning training.

## 功能特性 (Features)

- 🎯 简单易用的API，直接训练数据
- 📊 支持多种几何数据类型（点、线、多边形）
- 🔄 批量处理能力
- 🤖 与主流机器学习框架兼容
- 🚀 高性能栅格化引擎

## 安装 (Installation)

```bash
pip install -e .
```

或直接从源码安装：

```bash
git clone https://github.com/macintoshwan/Rasterizer.git
cd Rasterizer
pip install -r requirements.txt
```

## 快速开始 (Quick Start)

### 基础用法 (Basic Usage)

```python
import numpy as np
from rasterizer import Rasterizer

# 创建栅格化器
rasterizer = Rasterizer(width=256, height=256)

# 栅格化点数据
points = np.array([[10, 20], [30, 40], [50, 60]])
raster_image = rasterizer.rasterize_points(points, radius=2.0)

print(f"Rasterized image shape: {raster_image.shape}")
```

### 使用训练API (Using Training API)

这是本库的核心功能 - 提供直接训练数据的API：

```python
import numpy as np
from rasterizer import Trainer

# 创建训练器
trainer = Trainer(width=256, height=256)

# 准备你的矢量数据
data = [
    {'type': 'points', 'data': np.array([[10, 20], [30, 40]]), 'radius': 2.0},
    {'type': 'points', 'data': np.array([[50, 60], [70, 80]]), 'radius': 2.0},
    {'type': 'polygon', 'data': np.array([[0, 0], [10, 0], [10, 10], [0, 10]])},
]

# 标签
labels = np.array([0, 1, 0])

# 准备训练数据
X_train, y_train = trainer.prepare_training_data(data, labels)
print(f"Training data prepared: X shape = {X_train.shape}, y shape = {y_train.shape}")

# 如果你有一个Keras/TensorFlow模型
# model = create_your_model()
# result = trainer.train(X_train, y_train, model=model, epochs=10)
```

### 完整训练流程 (Complete Training Pipeline)

```python
from rasterizer import Trainer
import numpy as np

# 创建训练器
trainer = Trainer(width=128, height=128)

# 准备数据
raw_data = [
    {'type': 'points', 'data': np.random.rand(10, 2) * 100, 'radius': 3.0},
    {'type': 'points', 'data': np.random.rand(10, 2) * 100, 'radius': 3.0},
]
labels = np.array([0, 1])

# 一步完成：栅格化 + 训练
# result = trainer.train_from_raw_data(raw_data, labels, model=your_model)

# 或者只准备数据，用于自己的训练流程
X_train, y_train = trainer.prepare_training_data(raw_data, labels)

# 现在可以使用任何机器学习框架
# 例如 scikit-learn, PyTorch, TensorFlow等
```

## API文档 (API Documentation)

### Rasterizer类

核心栅格化功能。

```python
Rasterizer(width=256, height=256, resolution=1.0)
```

**方法：**

- `rasterize_points(points, radius=1.0)` - 栅格化点数据
- `rasterize_lines(lines, thickness=1.0)` - 栅格化线段数据
- `rasterize_polygon(vertices)` - 栅格化多边形
- `batch_rasterize(data_list)` - 批量栅格化混合类型数据

### Trainer类

高级训练API - **这是直接训练数据的主要接口**。

```python
Trainer(width=256, height=256, resolution=1.0)
```

**主要方法：**

- `prepare_training_data(data, labels, normalize=True)` - 准备训练数据
  - 将矢量数据转换为栅格图像
  - 可选的归一化
  - 返回可直接用于训练的numpy数组

- `train(X_train, y_train, model=None, epochs=10, ...)` - 训练模型
  - 支持任何有`fit()`方法的模型
  - 兼容Keras、scikit-learn等框架

- `train_from_raw_data(raw_data, labels, model=None, ...)` - 一步式训练
  - 从原始矢量数据到训练完成
  - 最简单的API使用方式

- `predict(data, normalize=True)` - 预测新数据

- `set_model(model)` - 设置预训练或加载的模型
  - 用于设置从文件加载的模型
  
- `save_model(filepath)` - 保存训练好的模型

## 数据格式 (Data Format)

支持的数据类型：

```python
# 点数据
{
    'type': 'points',
    'data': np.array([[x1, y1], [x2, y2], ...]),
    'radius': 2.0  # 可选
}

# 线段数据
{
    'type': 'lines',
    'data': [(start_point, end_point), ...],
    'thickness': 1.0  # 可选
}

# 多边形数据
{
    'type': 'polygon',
    'data': np.array([[x1, y1], [x2, y2], ...])  # 顶点坐标
}
```

## 使用场景 (Use Cases)

1. **几何形状分类** - 将几何图形转换为图像进行分类
2. **轨迹分析** - 将运动轨迹栅格化用于模式识别
3. **地图数据处理** - 将矢量地图转换为栅格用于深度学习
4. **计算机视觉** - 将结构化几何数据转换为视觉表示

## 示例 (Examples)

查看 `examples/` 目录获取更多示例：

- `basic_usage.py` - 基础栅格化示例
- `training_example.py` - 完整训练流程示例
- `custom_model.py` - 与自定义模型集成

## 依赖 (Requirements)

- Python >= 3.7
- numpy >= 1.19.0

可选依赖（用于模型训练）：
- tensorflow >= 2.0.0
- scikit-learn >= 0.24.0
- pytorch >= 1.7.0

## 贡献 (Contributing)

欢迎贡献！请随时提交问题和拉取请求。

## 许可证 (License)

MIT License

## 致谢 (Credits)

First release, credit to Claude.

---

## FAQ

### Q: 这个库提供训练API吗？
**A: 是的！** `Trainer`类提供了完整的训练API。你可以：
- 使用`prepare_training_data()`准备数据
- 使用`train()`训练模型
- 使用`train_from_raw_data()`一步完成整个流程

### Q: 支持哪些机器学习框架？
**A:** 兼容所有主流框架：TensorFlow/Keras、PyTorch、scikit-learn等。只要模型有`fit()`方法就可以使用。

### Q: 如何处理大规模数据？
**A:** 使用`batch_rasterize()`方法进行批量处理，并在训练时设置合适的`batch_size`。

### Q: 可以自定义栅格化参数吗？
**A:** 可以！创建`Rasterizer`或`Trainer`时可以设置`width`、`height`和`resolution`参数。
