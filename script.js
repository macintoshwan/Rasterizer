// 字体检测器类
class FontDetector {
    constructor() {
        this.baseFonts = ['monospace', 'sans-serif', 'serif'];
        this.testString = "mmmmmmmmmmlli";
        this.testSize = '72px';
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
    }

    async detect(font) {
        return new Promise((resolve) => {
            // 创建测试元素的方法
            const testWithElement = () => {
                const testElement = document.createElement('span');
                testElement.style.position = 'absolute';
                testElement.style.left = '-9999px';
                testElement.style.top = '-9999px';
                testElement.style.fontSize = this.testSize;
                testElement.style.visibility = 'hidden';
                testElement.textContent = this.testString;
                
                const defaultWidths = {};
                const testFont = font;
                
                // 测试基础字体宽度
                this.baseFonts.forEach(baseFont => {
                    testElement.style.fontFamily = baseFont;
                    document.body.appendChild(testElement);
                    defaultWidths[baseFont] = testElement.offsetWidth;
                    document.body.removeChild(testElement);
                });
                
                // 测试目标字体
                testElement.style.fontFamily = `"${testFont}", ${this.baseFonts[0]}`;
                document.body.appendChild(testElement);
                const testWidth = testElement.offsetWidth;
                document.body.removeChild(testElement);
                
                // 如果宽度与任何基础字体不同，说明字体可用
                const isAvailable = this.baseFonts.some(baseFont => 
                    testWidth !== defaultWidths[baseFont]
                );
                
                resolve(isAvailable);
            };

            // 使用Canvas方法作为备用
            const testWithCanvas = () => {
                try {
                    this.context.font = `${this.testSize} ${font}`;
                    const metrics1 = this.context.measureText(this.testString);
                    
                    this.context.font = `${this.testSize} monospace`;
                    const metrics2 = this.context.measureText(this.testString);
                    
                    resolve(Math.abs(metrics1.width - metrics2.width) > 1);
                } catch (e) {
                    resolve(false);
                }
            };

            // 优先使用元素检测方法
            try {
                testWithElement();
            } catch (e) {
                testWithCanvas();
            }
        });
    }
}

class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawing-canvas');
        this.currentTool = 'select';
        this.selectedElement = null;
        this.isDrawing = false;
        this.startPoint = { x: 0, y: 0 };
        this.elements = [];
        this.currentCanvas = 'default';
        this.canvasData = {
            'default': []
        };
        this.availableFonts = [];
        
        // LED显示器相关
        this.ledMatrix = null;
        this.ledPixels = [];
        this.ledUpdateEnabled = true;
        this.ledUpdateTimer = null;
        
        // 调整手柄相关
        this.resizeHandles = null;
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStartPoint = { x: 0, y: 0 };
        this.originalBounds = { x: 0, y: 0, width: 0, height: 0 };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updatePropertyValues();
        this.loadCanvasList();
        this.loadCanvas('default');
        // 异步加载字体列表
        await this.loadSystemFonts();
        // 初始化LED显示器
        this.initLEDDisplay();
        // 初始化时显示选择工具属性
        this.updateToolProperties('select');
    }

    setupEventListeners() {
        // 工具按钮事件
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.dataset.tool);
            });
        });

        // 画布事件
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // 默认属性控制事件
        document.getElementById('stroke-width').addEventListener('input', (e) => {
            document.getElementById('stroke-width-value').textContent = e.target.value;
        });

        document.getElementById('font-size').addEventListener('input', (e) => {
            document.getElementById('font-size-value').textContent = e.target.value;
        });

        // 文字工具专用颜色控件事件
        document.getElementById('fill-color-text').addEventListener('input', (e) => {
            // 文字颜色变化事件（可以添加实时预览等功能）
        });

        // 选中元素属性编辑事件
        this.setupSelectedElementEvents();

        // 文字对话框事件
        document.getElementById('text-confirm').addEventListener('click', () => {
            this.confirmTextInput();
        });

        document.getElementById('text-cancel').addEventListener('click', () => {
            this.cancelTextInput();
        });

        // 画板管理事件
        document.getElementById('canvas-selector').addEventListener('change', (e) => {
            this.switchCanvas(e.target.value);
        });

        document.getElementById('new-canvas-btn').addEventListener('click', () => {
            this.createNewCanvas();
        });

        document.getElementById('save-canvas-btn').addEventListener('click', () => {
            this.saveCurrentCanvas();
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedElement) {
                this.deleteSelectedElement();
            }
        });
    }

    setupSelectedElementEvents() {
        // 编辑属性的实时更新事件
        const editControls = [
            'edit-fill-color', 'edit-stroke-color', 'edit-stroke-width',
            'edit-x', 'edit-y', 'edit-width', 'edit-height', 'edit-radius',
            'edit-text-content', 'edit-font-family', 'edit-font-size'
        ];

        editControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateSelectedElementProperty(id);
                });
            }
        });

        // 滑块值显示更新
        document.getElementById('edit-stroke-width').addEventListener('input', (e) => {
            document.getElementById('edit-stroke-width-value').textContent = e.target.value;
        });

        document.getElementById('edit-font-size').addEventListener('input', (e) => {
            document.getElementById('edit-font-size-value').textContent = e.target.value;
        });

        // 操作按钮事件
        document.getElementById('apply-changes').addEventListener('click', () => {
            this.applyChangesToSelectedElement();
        });

        document.getElementById('delete-element').addEventListener('click', () => {
            this.deleteSelectedElement();
        });
    }

    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // 清除选择（如果不是选择工具）
        if (tool !== 'select') {
            this.clearSelection();
        }
        
        // 更新属性面板显示
        this.updateToolProperties(tool);
        
        // 更改光标样式
        this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    }

    updateToolProperties(tool) {
        // 隐藏所有属性组
        document.getElementById('select-tool-info').style.display = 'none';
        document.getElementById('shape-properties').style.display = 'none';
        document.getElementById('text-properties').style.display = 'none';

        // 根据工具显示相应的属性
        switch(tool) {
            case 'select':
                document.getElementById('select-tool-info').style.display = 'block';
                document.getElementById('property-title').textContent = '选择工具';
                break;
            case 'rectangle':
            case 'circle':
                document.getElementById('shape-properties').style.display = 'block';
                document.getElementById('property-title').textContent = 
                    tool === 'rectangle' ? '长方形属性' : '圆形属性';
                break;
            case 'text':
                document.getElementById('text-properties').style.display = 'block';
                document.getElementById('property-title').textContent = '文字属性';
                break;
            default:
                document.getElementById('select-tool-info').style.display = 'block';
                document.getElementById('property-title').textContent = '属性';
        }
    }

    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.viewBox.baseVal.width / rect.width;
        const scaleY = this.canvas.viewBox.baseVal.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleMouseDown(e) {
        // 如果正在调整大小，不处理其他鼠标事件
        if (this.isResizing) {
            return;
        }
        
        const point = this.getMousePosition(e);
        this.startPoint = point;

        if (this.currentTool === 'select') {
            this.handleSelectTool(e);
        } else if (this.currentTool === 'text') {
            this.handleTextTool(point);
        } else {
            this.isDrawing = true;
            this.clearSelection();
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;

        const point = this.getMousePosition(e);
        this.updateDrawingPreview(point);
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;

        const point = this.getMousePosition(e);
        this.createShape(point);
        this.isDrawing = false;
    }

    handleSelectTool(e) {
        const clickedElement = e.target;
        
        if (clickedElement === this.canvas || clickedElement.tagName === 'rect' && clickedElement.getAttribute('fill') === '#000000') {
            // 点击背景，清除选择
            this.clearSelection();
        } else {
            // 点击元素，选择它
            this.selectElement(clickedElement);
        }
    }

    handleTextTool(point) {
        this.textPosition = point;
        document.getElementById('text-dialog').classList.remove('hidden');
        document.getElementById('text-input').focus();
    }

    updateDrawingPreview(point) {
        // 移除之前的预览
        const preview = document.getElementById('drawing-preview');
        if (preview) preview.remove();

        // 创建新的预览
        let element;
        const width = Math.abs(point.x - this.startPoint.x);
        const height = Math.abs(point.y - this.startPoint.y);
        const x = Math.min(this.startPoint.x, point.x);
        const y = Math.min(this.startPoint.y, point.y);

        if (this.currentTool === 'rectangle') {
            element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            element.setAttribute('x', x);
            element.setAttribute('y', y);
            element.setAttribute('width', width);
            element.setAttribute('height', height);
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(width * width + height * height) / 2;
            element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            element.setAttribute('cx', this.startPoint.x);
            element.setAttribute('cy', this.startPoint.y);
            element.setAttribute('r', radius);
        }

        if (element) {
            element.id = 'drawing-preview';
            this.applyCurrentStyles(element);
            element.style.opacity = '0.7';
            this.canvas.appendChild(element);
        }
    }

    createShape(point) {
        // 移除预览
        const preview = document.getElementById('drawing-preview');
        if (preview) preview.remove();

        let element;
        const width = Math.abs(point.x - this.startPoint.x);
        const height = Math.abs(point.y - this.startPoint.y);

        // 最小尺寸检查
        if (width < 5 && height < 5) return;

        const x = Math.min(this.startPoint.x, point.x);
        const y = Math.min(this.startPoint.y, point.y);

        if (this.currentTool === 'rectangle') {
            element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            element.setAttribute('x', x);
            element.setAttribute('y', y);
            element.setAttribute('width', width);
            element.setAttribute('height', height);
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(width * width + height * height) / 2;
            element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            element.setAttribute('cx', this.startPoint.x);
            element.setAttribute('cy', this.startPoint.y);
            element.setAttribute('r', radius);
        }

        if (element) {
            element.id = 'element-' + Date.now();
            this.applyCurrentStyles(element);
            this.addInteractivity(element);
            this.canvas.appendChild(element);
            this.elements.push(element);
            this.saveCanvasState();
        }
    }

    createTextElement(text) {
        if (!text.trim()) return;

        const element = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        element.setAttribute('x', this.textPosition.x);
        element.setAttribute('y', this.textPosition.y);
        element.textContent = text;
        element.id = 'element-' + Date.now();

        // 应用文字样式（使用文字专用控件）
        const fillColor = document.getElementById('fill-color-text').value;
        const fontSize = document.getElementById('font-size').value;
        const fontFamily = document.getElementById('font-family').value;

        element.setAttribute('fill', fillColor);
        element.setAttribute('font-size', fontSize);
        element.setAttribute('font-family', fontFamily);

        this.addInteractivity(element);
        this.canvas.appendChild(element);
        this.elements.push(element);
        this.saveCanvasState();
    }

    applyCurrentStyles(element) {
        if (this.currentTool === 'text') {
            // 文字工具使用专用的颜色控件
            const fillColor = document.getElementById('fill-color-text').value;
            element.setAttribute('fill', fillColor);
            // 文字通常不需要边框
        } else {
            // 图形工具使用图形属性控件
            const fillColor = document.getElementById('fill-color').value;
            const strokeColor = document.getElementById('stroke-color').value;
            const strokeWidth = document.getElementById('stroke-width').value;

            element.setAttribute('fill', fillColor);
            element.setAttribute('stroke', strokeColor);
            element.setAttribute('stroke-width', strokeWidth);
        }
    }

    addInteractivity(element) {
        element.style.cursor = 'move';
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        element.addEventListener('mousedown', (e) => {
            if (this.currentTool !== 'select') return;
            
            e.stopPropagation();
            this.selectElement(element);
            
            isDragging = true;
            const point = this.getMousePosition(e);
            const elementPos = this.getElementPosition(element);
            dragOffset = {
                x: point.x - elementPos.x,
                y: point.y - elementPos.y
            };
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || this.currentTool !== 'select') return;
            
            const point = this.getMousePosition(e);
            const newX = point.x - dragOffset.x;
            const newY = point.y - dragOffset.y;
            
            this.moveElement(element, newX, newY);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.saveCanvasState();
            }
        });
    }

    getElementPosition(element) {
        if (element.tagName === 'rect') {
            return {
                x: parseFloat(element.getAttribute('x')),
                y: parseFloat(element.getAttribute('y'))
            };
        } else if (element.tagName === 'circle') {
            return {
                x: parseFloat(element.getAttribute('cx')),
                y: parseFloat(element.getAttribute('cy'))
            };
        } else if (element.tagName === 'text') {
            return {
                x: parseFloat(element.getAttribute('x')),
                y: parseFloat(element.getAttribute('y'))
            };
        }
        return { x: 0, y: 0 };
    }

    moveElement(element, x, y) {
        if (element.tagName === 'rect') {
            element.setAttribute('x', Math.max(0, x));
            element.setAttribute('y', Math.max(0, y));
        } else if (element.tagName === 'circle') {
            const r = parseFloat(element.getAttribute('r'));
            element.setAttribute('cx', Math.max(r, Math.min(640 - r, x)));
            element.setAttribute('cy', Math.max(r, Math.min(320 - r, y)));
        } else if (element.tagName === 'text') {
            element.setAttribute('x', Math.max(0, x));
            element.setAttribute('y', Math.max(0, y));
        }
    }

    selectElement(element) {
        this.clearSelection();
        this.selectedElement = element;
        element.classList.add('selected');
        
        // 为长方形和文字添加调整手柄
        if (element.tagName === 'rect' || element.tagName === 'text') {
            this.showResizeHandles(element);
        }
        
        // 切换到编辑模式
        this.showElementProperties(element);
    }

    clearSelection() {
        if (this.selectedElement) {
            this.selectedElement.classList.remove('selected');
            this.selectedElement = null;
        }
        
        // 隐藏调整手柄
        this.hideResizeHandles();
        
        // 隐藏编辑属性面板，显示默认属性面板
        this.hideElementProperties();
    }

    showElementProperties(element) {
        // 隐藏默认属性面板
        document.getElementById('default-properties').style.display = 'none';
        
        // 显示选中元素属性面板
        const selectedPanel = document.getElementById('selected-properties');
        selectedPanel.style.display = 'block';
        
        // 更新标题和元素类型信息
        document.getElementById('property-title').textContent = '编辑元素';
        document.getElementById('element-type').textContent = `元素类型: ${this.getElementTypeName(element)}`;
        
        // 根据元素类型显示相应的属性控制
        this.updatePropertyPanel(element);
        
        // 加载当前元素的属性值
        this.loadElementProperties(element);
    }

    hideElementProperties() {
        // 显示默认属性面板
        document.getElementById('default-properties').style.display = 'block';
        
        // 隐藏选中元素属性面板
        document.getElementById('selected-properties').style.display = 'none';
        
        // 恢复标题
        document.getElementById('property-title').textContent = '属性';
    }

    updateElementProperties(element) {
        // 重新加载元素属性到面板中
        this.loadElementProperties(element);
    }

    getElementTypeName(element) {
        switch(element.tagName) {
            case 'rect': return '长方形';
            case 'circle': return '圆形';
            case 'text': return '文字';
            default: return '未知';
        }
    }

    updatePropertyPanel(element) {
        // 隐藏所有特定属性组
        document.getElementById('edit-size-group').style.display = 'none';
        document.getElementById('edit-radius-group').style.display = 'none';
        document.getElementById('edit-text-group').style.display = 'none';
        document.getElementById('edit-font-group').style.display = 'none';
        document.getElementById('edit-font-size-group').style.display = 'none';

        // 根据元素类型显示相应属性
        if (element.tagName === 'rect') {
            document.getElementById('edit-size-group').style.display = 'block';
        } else if (element.tagName === 'circle') {
            document.getElementById('edit-radius-group').style.display = 'block';
        } else if (element.tagName === 'text') {
            document.getElementById('edit-text-group').style.display = 'block';
            document.getElementById('edit-font-group').style.display = 'block';
            document.getElementById('edit-font-size-group').style.display = 'block';
            // 隐藏边框相关属性（文字通常不需要边框）
            document.getElementById('edit-stroke-group').style.display = 'none';
            document.getElementById('edit-stroke-width-group').style.display = 'none';
        } else {
            // 显示边框属性
            document.getElementById('edit-stroke-group').style.display = 'block';
            document.getElementById('edit-stroke-width-group').style.display = 'block';
        }
    }

    loadElementProperties(element) {
        // 加载通用属性
        const fillColor = element.getAttribute('fill') || '#ff0000';
        const strokeColor = element.getAttribute('stroke') || '#000000';
        const strokeWidth = element.getAttribute('stroke-width') || '1';

        document.getElementById('edit-fill-color').value = fillColor;
        document.getElementById('edit-stroke-color').value = strokeColor;
        document.getElementById('edit-stroke-width').value = strokeWidth;
        document.getElementById('edit-stroke-width-value').textContent = strokeWidth;

        // 加载位置属性
        let x, y;
        if (element.tagName === 'rect') {
            x = element.getAttribute('x') || '0';
            y = element.getAttribute('y') || '0';
            const width = element.getAttribute('width') || '0';
            const height = element.getAttribute('height') || '0';
            document.getElementById('edit-width').value = Math.round(parseFloat(width));
            document.getElementById('edit-height').value = Math.round(parseFloat(height));
        } else if (element.tagName === 'circle') {
            x = element.getAttribute('cx') || '0';
            y = element.getAttribute('cy') || '0';
            const radius = element.getAttribute('r') || '0';
            document.getElementById('edit-radius').value = Math.round(parseFloat(radius));
        } else if (element.tagName === 'text') {
            x = element.getAttribute('x') || '0';
            y = element.getAttribute('y') || '0';
            const fontSize = element.getAttribute('font-size') || '16';
            const fontFamily = element.getAttribute('font-family') || 'Arial';
            document.getElementById('edit-text-content').value = element.textContent || '';
            document.getElementById('edit-font-size').value = fontSize;
            document.getElementById('edit-font-size-value').textContent = fontSize;
            document.getElementById('edit-font-family').value = fontFamily;
        }

        document.getElementById('edit-x').value = Math.round(parseFloat(x));
        document.getElementById('edit-y').value = Math.round(parseFloat(y));
    }

    updateSelectedElementProperty(controlId) {
        if (!this.selectedElement) return;

        const element = this.selectedElement;
        const control = document.getElementById(controlId);
        const value = control.value;

        switch(controlId) {
            case 'edit-fill-color':
                element.setAttribute('fill', value);
                break;
            case 'edit-stroke-color':
                element.setAttribute('stroke', value);
                break;
            case 'edit-stroke-width':
                element.setAttribute('stroke-width', value);
                document.getElementById('edit-stroke-width-value').textContent = value;
                break;
            case 'edit-x':
                this.updateElementPosition('x', parseFloat(value));
                break;
            case 'edit-y':
                this.updateElementPosition('y', parseFloat(value));
                break;
            case 'edit-width':
                if (element.tagName === 'rect') {
                    element.setAttribute('width', Math.max(1, parseFloat(value)));
                }
                break;
            case 'edit-height':
                if (element.tagName === 'rect') {
                    element.setAttribute('height', Math.max(1, parseFloat(value)));
                }
                break;
            case 'edit-radius':
                if (element.tagName === 'circle') {
                    element.setAttribute('r', Math.max(1, parseFloat(value)));
                }
                break;
            case 'edit-text-content':
                if (element.tagName === 'text') {
                    element.textContent = value;
                }
                break;
            case 'edit-font-family':
                if (element.tagName === 'text') {
                    element.setAttribute('font-family', value);
                }
                break;
            case 'edit-font-size':
                if (element.tagName === 'text') {
                    element.setAttribute('font-size', value);
                    document.getElementById('edit-font-size-value').textContent = value;
                }
                break;
        }

        // 自动保存画布状态
        this.saveCanvasState();
    }

    updateElementPosition(axis, value) {
        if (!this.selectedElement) return;

        const element = this.selectedElement;
        
        if (element.tagName === 'rect') {
            if (axis === 'x') {
                element.setAttribute('x', Math.max(0, Math.min(640, value)));
            } else {
                element.setAttribute('y', Math.max(0, Math.min(320, value)));
            }
        } else if (element.tagName === 'circle') {
            const radius = parseFloat(element.getAttribute('r')) || 0;
            if (axis === 'x') {
                element.setAttribute('cx', Math.max(radius, Math.min(640 - radius, value)));
            } else {
                element.setAttribute('cy', Math.max(radius, Math.min(320 - radius, value)));
            }
        } else if (element.tagName === 'text') {
            if (axis === 'x') {
                element.setAttribute('x', Math.max(0, Math.min(640, value)));
            } else {
                element.setAttribute('y', Math.max(20, Math.min(320, value)));
            }
        }
    }

    applyChangesToSelectedElement() {
        if (!this.selectedElement) return;

        // 所有更改都是实时应用的，这里主要是保存状态和给用户反馈
        this.saveCanvasState();
        
        // 显示成功消息
        this.showMessage('属性更改已应用！', 'success');
    }

    deleteSelectedElement() {
        if (this.selectedElement) {
            const index = this.elements.indexOf(this.selectedElement);
            if (index > -1) {
                this.elements.splice(index, 1);
            }
            this.selectedElement.remove();
            this.selectedElement = null;
            this.hideElementProperties(); // 隐藏属性面板
            this.saveCanvasState();
            this.showMessage('元素已删除', 'success');
        }
    }

    showMessage(text, type = 'info') {
        // 创建临时消息提示
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            transition: all 0.3s ease;
            ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #007acc;'}
        `;
        
        document.body.appendChild(message);
        
        // 3秒后自动移除
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateX(100%)';
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    confirmTextInput() {
        const text = document.getElementById('text-input').value;
        this.createTextElement(text);
        this.cancelTextInput();
    }

    cancelTextInput() {
        document.getElementById('text-dialog').classList.add('hidden');
        document.getElementById('text-input').value = '';
    }

    async loadSystemFonts() {
        console.log('开始加载系统字体...');
        
        // 添加加载状态
        const defaultSelector = document.getElementById('font-family');
        const editSelector = document.getElementById('edit-font-family');
        defaultSelector.classList.add('loading-fonts');
        editSelector.classList.add('loading-fonts');
        
        try {
            // 首先检查是否支持新的Font Access API
            if ('queryLocalFonts' in window) {
                try {
                    await this.loadFontsWithAPI();
                } catch (error) {
                    console.log('Font Access API不可用，使用字体检测方法:', error);
                    await this.loadFontsWithDetection();
                }
            } else {
                console.log('使用传统字体检测方法');
                await this.loadFontsWithDetection();
            }
            
            this.populateFontSelectors();
        } finally {
            // 移除加载状态
            defaultSelector.classList.remove('loading-fonts');
            editSelector.classList.remove('loading-fonts');
        }
    }

    async loadFontsWithAPI() {
        // 使用新的Font Access API（Chrome 103+）
        const fonts = await window.queryLocalFonts();
        const fontFamilies = new Set();
        
        fonts.forEach(font => {
            if (font.family) {
                fontFamilies.add(font.family);
            }
        });
        
        this.availableFonts = Array.from(fontFamilies).sort();
        console.log(`使用Font Access API检测到 ${this.availableFonts.length} 个字体`);
    }

    async loadFontsWithDetection() {
        // 常见的系统字体列表
        const commonFonts = [
            // Windows 字体
            'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Consolas', 'Corbel', 'Courier New', 
            'Franklin Gothic Medium', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
            'Microsoft Sans Serif', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman',
            'Trebuchet MS', 'Verdana', 'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'FangSong',
            
            // macOS 字体
            'Helvetica', 'Helvetica Neue', 'San Francisco', 'Avenir', 'Avenir Next', 'Futura',
            'Gill Sans', 'Optima', 'Palatino', 'Baskerville', 'Big Caslon', 'Bodoni 72',
            'Bradley Hand', 'Brush Script MT', 'Chalkboard', 'Cochin', 'Copperplate',
            'PingFang SC', 'PingFang TC', 'Hiragino Sans GB', 'STHeiti', 'STSong',
            
            // Linux 常见字体
            'Ubuntu', 'Ubuntu Mono', 'Liberation Sans', 'Liberation Serif', 'Liberation Mono',
            'DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono', 'Noto Sans', 'Noto Serif',
            'Source Sans Pro', 'Source Code Pro', 'Droid Sans', 'Roboto',
            
            // Web 安全字体
            'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
            
            // 额外的中文字体
            '宋体', '黑体', '楷体', '仿宋', '微软雅黑', '华文宋体', '华文黑体', '华文楷体',
            '华文仿宋', '华文细黑', '华文隶书', '华文行楷', '方正舒体', '方正姚体',
            
            // 英文字体
            'Times', 'Garamond', 'Minion Pro', 'Myriad Pro', 'Adobe Garamond Pro',
            'Trajan Pro', 'Warnock Pro', 'Caslon', 'Sabon', 'Frutiger'
        ];

        // 检测可用字体
        this.availableFonts = [];
        const detector = new FontDetector();
        
        for (const font of commonFonts) {
            if (await detector.detect(font)) {
                this.availableFonts.push(font);
            }
        }
        
        console.log(`使用字体检测方法检测到 ${this.availableFonts.length} 个字体`);
    }

    populateFontSelectors() {
        const defaultSelector = document.getElementById('font-family');
        const editSelector = document.getElementById('edit-font-family');
        
        // 清空现有选项
        defaultSelector.innerHTML = '';
        editSelector.innerHTML = '';
        
        // 添加默认选项
        if (this.availableFonts.length === 0) {
            // 如果检测失败，使用基本字体
            const basicFonts = [
                { value: 'Arial', name: 'Arial' },
                { value: 'serif', name: '宋体 (Serif)' },
                { value: 'sans-serif', name: '黑体 (Sans-serif)' },
                { value: 'Microsoft YaHei', name: '微软雅黑' },
                { value: 'monospace', name: '等宽字体 (Monospace)' }
            ];
            
            basicFonts.forEach(font => {
                const option1 = this.createFontOption(font.name, font.value);
                const option2 = this.createFontOption(font.name, font.value);
                defaultSelector.add(option1);
                editSelector.add(option2);
            });
        } else {
            // 使用检测到的字体
            this.availableFonts.forEach(font => {
                const displayName = this.getFontDisplayName(font);
                const option1 = this.createFontOption(displayName, font);
                const option2 = this.createFontOption(displayName, font);
                defaultSelector.add(option1);
                editSelector.add(option2);
            });
        }
        
        // 设置默认选择
        const defaultFont = this.availableFonts.includes('Microsoft YaHei') ? 'Microsoft YaHei' : 
                           (this.availableFonts.length > 0 ? this.availableFonts[0] : 'Arial');
        defaultSelector.value = defaultFont;
        editSelector.value = defaultFont;
        
        // 为选择器添加字体预览事件
        this.addFontPreviewEvents();
        
        console.log('字体选择器已更新');
    }

    createFontOption(displayName, fontValue) {
        const option = new Option(displayName, fontValue);
        // 为选项应用对应的字体样式
        option.style.fontFamily = `"${fontValue}", fallback, sans-serif`;
        option.style.fontSize = '14px';
        option.className = 'font-preview';
        return option;
    }

    addFontPreviewEvents() {
        const selectors = [document.getElementById('font-family'), document.getElementById('edit-font-family')];
        
        selectors.forEach(selector => {
            if (!selector) return;
            
            // 鼠标悬停时显示字体预览
            selector.addEventListener('mouseenter', (e) => {
                const selectedFont = e.target.value;
                if (selectedFont) {
                    e.target.style.fontFamily = `"${selectedFont}", sans-serif`;
                }
            });
            
            // 选择改变时应用字体
            selector.addEventListener('change', (e) => {
                const selectedFont = e.target.value;
                if (selectedFont) {
                    e.target.style.fontFamily = `"${selectedFont}", sans-serif`;
                }
            });
        });
    }

    getFontDisplayName(fontFamily) {
        // 为一些字体提供更友好的显示名称
        const displayNames = {
            'serif': '宋体 (Serif)',
            'sans-serif': '黑体 (Sans-serif)', 
            'monospace': '等宽字体 (Monospace)',
            'cursive': '手写体 (Cursive)',
            'fantasy': '装饰字体 (Fantasy)',
            'Microsoft YaHei': '微软雅黑',
            'SimSun': '宋体',
            'SimHei': '黑体',
            'KaiTi': '楷体',
            'FangSong': '仿宋',
            'PingFang SC': '苹方-简',
            'Hiragino Sans GB': '冬青黑体-简体中文',
            'STHeiti': '华文黑体',
            'STSong': '华文宋体'
        };
        
        return displayNames[fontFamily] || fontFamily;
    }

    // 调整手柄相关方法
    showResizeHandles(element) {
        this.hideResizeHandles();
        
        const bounds = this.getElementBounds(element);
        if (!bounds) return;
        
        // 创建调整手柄容器
        this.resizeHandles = document.createElement('div');
        this.resizeHandles.className = 'resize-handles';
        
        // 创建8个调整手柄（四个角 + 四个边的中点）
        const handles = [
            { class: 'nw', x: bounds.x, y: bounds.y },
            { class: 'ne', x: bounds.x + bounds.width, y: bounds.y },
            { class: 'sw', x: bounds.x, y: bounds.y + bounds.height },
            { class: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { class: 'n', x: bounds.x + bounds.width / 2, y: bounds.y },
            { class: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            { class: 'w', x: bounds.x, y: bounds.y + bounds.height / 2 },
            { class: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }
        ];
        
        handles.forEach(handle => {
            const handleElement = document.createElement('div');
            handleElement.className = `resize-handle ${handle.class}`;
            handleElement.style.left = `${handle.x - 4}px`;
            handleElement.style.top = `${handle.y - 4}px`;
            handleElement.dataset.direction = handle.class;
            
            // 添加鼠标事件
            handleElement.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResize(e, handle.class);
            });
            
            this.resizeHandles.appendChild(handleElement);
        });
        
        // 添加到画布容器
        document.querySelector('.canvas-container').appendChild(this.resizeHandles);
    }

    hideResizeHandles() {
        if (this.resizeHandles) {
            this.resizeHandles.remove();
            this.resizeHandles = null;
        }
    }

    getElementBounds(element) {
        if (element.tagName === 'rect') {
            return {
                x: parseFloat(element.getAttribute('x')),
                y: parseFloat(element.getAttribute('y')),
                width: parseFloat(element.getAttribute('width')),
                height: parseFloat(element.getAttribute('height'))
            };
        } else if (element.tagName === 'text') {
            const bbox = element.getBBox();
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            };
        }
        return null;
    }

    startResize(e, direction) {
        this.isResizing = true;
        this.resizeHandle = direction;
        this.resizeStartPoint = { x: e.clientX, y: e.clientY };
        
        // 记录原始边界
        this.originalBounds = this.getElementBounds(this.selectedElement);
        
        // 添加全局鼠标事件
        document.addEventListener('mousemove', this.handleResize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));
        
        // 防止选择文本
        e.preventDefault();
    }

    handleResize(e) {
        if (!this.isResizing || !this.selectedElement) return;
        
        const deltaX = e.clientX - this.resizeStartPoint.x;
        const deltaY = e.clientY - this.resizeStartPoint.y;
        
        const bounds = { ...this.originalBounds };
        
        // 根据拖动方向调整大小
        switch (this.resizeHandle) {
            case 'nw':
                bounds.x += deltaX;
                bounds.y += deltaY;
                bounds.width -= deltaX;
                bounds.height -= deltaY;
                break;
            case 'ne':
                bounds.y += deltaY;
                bounds.width += deltaX;
                bounds.height -= deltaY;
                break;
            case 'sw':
                bounds.x += deltaX;
                bounds.width -= deltaX;
                bounds.height += deltaY;
                break;
            case 'se':
                bounds.width += deltaX;
                bounds.height += deltaY;
                break;
            case 'n':
                bounds.y += deltaY;
                bounds.height -= deltaY;
                break;
            case 's':
                bounds.height += deltaY;
                break;
            case 'w':
                bounds.x += deltaX;
                bounds.width -= deltaX;
                break;
            case 'e':
                bounds.width += deltaX;
                break;
        }
        
        // 限制最小尺寸
        bounds.width = Math.max(10, bounds.width);
        bounds.height = Math.max(10, bounds.height);
        
        // 更新元素
        this.updateElementBounds(this.selectedElement, bounds);
        
        // 更新调整手柄位置
        this.updateResizeHandles(bounds);
        
        // 更新属性面板
        this.updateElementProperties(this.selectedElement);
    }

    stopResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.resizeHandle = null;
        
        // 移除全局鼠标事件
        document.removeEventListener('mousemove', this.handleResize.bind(this));
        document.removeEventListener('mouseup', this.stopResize.bind(this));
        
        // 保存状态
        this.saveCanvasState();
    }

    updateElementBounds(element, bounds) {
        if (element.tagName === 'rect') {
            element.setAttribute('x', bounds.x);
            element.setAttribute('y', bounds.y);
            element.setAttribute('width', bounds.width);
            element.setAttribute('height', bounds.height);
        } else if (element.tagName === 'text') {
            // 对于文字，调整位置和字体大小
            const currentFontSize = parseFloat(element.getAttribute('font-size')) || 16;
            const scaleX = bounds.width / this.originalBounds.width;
            const scaleY = bounds.height / this.originalBounds.height;
            const scale = Math.min(scaleX, scaleY); // 保持比例
            
            const newFontSize = Math.max(8, Math.min(256, currentFontSize * scale));
            element.setAttribute('font-size', newFontSize);
            element.setAttribute('x', bounds.x);
            element.setAttribute('y', bounds.y + bounds.height * 0.8); // 调整基线位置
        }
    }

    updateResizeHandles(bounds) {
        if (!this.resizeHandles) return;
        
        const handles = this.resizeHandles.querySelectorAll('.resize-handle');
        const positions = [
            { class: 'nw', x: bounds.x, y: bounds.y },
            { class: 'ne', x: bounds.x + bounds.width, y: bounds.y },
            { class: 'sw', x: bounds.x, y: bounds.y + bounds.height },
            { class: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { class: 'n', x: bounds.x + bounds.width / 2, y: bounds.y },
            { class: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            { class: 'w', x: bounds.x, y: bounds.y + bounds.height / 2 },
            { class: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }
        ];
        
        handles.forEach((handle, index) => {
            const pos = positions[index];
            handle.style.left = `${pos.x - 4}px`;
            handle.style.top = `${pos.y - 4}px`;
        });
    }

    updatePropertyValues() {
        document.getElementById('stroke-width-value').textContent = 
            document.getElementById('stroke-width').value;
        document.getElementById('font-size-value').textContent = 
            document.getElementById('font-size').value;
    }

    initLEDDisplay() {
        this.ledMatrix = document.getElementById('led-matrix');
        
        // 创建64x32个LED像素
        this.ledPixels = [];
        for (let row = 0; row < 32; row++) {
            this.ledPixels[row] = [];
            for (let col = 0; col < 64; col++) {
                const pixel = document.createElement('div');
                pixel.className = 'led-pixel';
                pixel.dataset.row = row;
                pixel.dataset.col = col;
                this.ledMatrix.appendChild(pixel);
                this.ledPixels[row][col] = pixel;
            }
        }
        
        // 添加LED控制事件
        document.getElementById('led-enabled').addEventListener('change', (e) => {
            this.ledUpdateEnabled = e.target.checked;
            if (this.ledUpdateEnabled) {
                this.updateLEDDisplay();
            }
        });
        
        document.getElementById('refresh-led').addEventListener('click', () => {
            this.updateLEDDisplay();
        });
        
        // 初始更新
        this.updateLEDDisplay();
        
        // 设置定时更新（避免过于频繁）
        this.ledUpdateTimer = setInterval(() => {
            if (this.ledUpdateEnabled) {
                this.updateLEDDisplay();
            }
        }, 200); // 每200ms更新一次
        
        console.log('LED显示器初始化完成');
    }

    updateLEDDisplay() {
        // 创建一个隐藏的canvas来采样SVG内容
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 64;
        tempCanvas.height = 32;
        const ctx = tempCanvas.getContext('2d');
        
        // 将SVG转换为图像
        this.convertSVGToLED(ctx);
    }

    async convertSVGToLED(ctx) {
        try {
            // 获取SVG内容
            const svgData = new XMLSerializer().serializeToString(this.canvas);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            // 创建图像
            const img = new Image();
            img.onload = () => {
                // 清除画布
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 64, 32);
                
                // 绘制图像到64x32的canvas上
                ctx.drawImage(img, 0, 0, 64, 32);
                
                // 获取像素数据
                const imageData = ctx.getImageData(0, 0, 64, 32);
                const data = imageData.data;
                
                // 更新LED像素
                for (let row = 0; row < 32; row++) {
                    for (let col = 0; col < 64; col++) {
                        const pixelIndex = (row * 64 + col) * 4;
                        const r = data[pixelIndex];
                        const g = data[pixelIndex + 1];
                        const b = data[pixelIndex + 2];
                        const a = data[pixelIndex + 3];
                        
                        const ledPixel = this.ledPixels[row][col];
                        this.updateLEDPixel(ledPixel, r, g, b, a);
                    }
                }
                
                URL.revokeObjectURL(svgUrl);
            };
            
            img.onerror = () => {
                console.log('SVG转换失败，使用备用方法');
                URL.revokeObjectURL(svgUrl);
                this.updateLEDWithBackupMethod();
            };
            
            img.src = svgUrl;
            
        } catch (error) {
            console.log('LED更新失败:', error);
            this.updateLEDWithBackupMethod();
        }
    }

    updateLEDPixel(ledPixel, r, g, b, a) {
        // 清除之前的类
        ledPixel.classList.remove('active', 'red', 'green', 'blue', 'white', 'yellow', 'cyan', 'magenta', 'orange');
        
        // 如果像素完全透明或完全黑色，显示为暗像素
        if (a < 50 || (r < 20 && g < 20 && b < 20)) {
            ledPixel.style.background = '#1a1a1a';
            return;
        }
        
        // 激活LED像素
        ledPixel.classList.add('active');
        
        // 根据颜色分类显示
        const colorClass = this.getColorClass(r, g, b);
        if (colorClass) {
            ledPixel.classList.add(colorClass);
        } else {
            // 使用实际颜色
            ledPixel.style.background = `rgb(${r}, ${g}, ${b})`;
            ledPixel.style.color = `rgb(${r}, ${g}, ${b})`;
        }
    }

    getColorClass(r, g, b) {
        // 简化颜色到主要色彩类别
        const threshold = 128;
        const isRed = r > threshold;
        const isGreen = g > threshold;
        const isBlue = b > threshold;
        
        if (isRed && isGreen && isBlue) return 'white';
        if (isRed && isGreen && !isBlue) return 'yellow';
        if (isRed && !isGreen && isBlue) return 'magenta';
        if (!isRed && isGreen && isBlue) return 'cyan';
        if (isRed && !isGreen && !isBlue) return 'red';
        if (!isRed && isGreen && !isBlue) return 'green';
        if (!isRed && !isGreen && isBlue) return 'blue';
        if (isRed && g > 64 && !isBlue) return 'orange'; // 橙色
        
        return null; // 使用实际颜色
    }

    updateLEDWithBackupMethod() {
        // 备用方法：简单地根据元素位置显示
        // 清除所有LED
        for (let row = 0; row < 32; row++) {
            for (let col = 0; col < 64; col++) {
                const ledPixel = this.ledPixels[row][col];
                ledPixel.classList.remove('active', 'red', 'green', 'blue', 'white', 'yellow', 'cyan', 'magenta', 'orange');
                ledPixel.style.background = '#1a1a1a';
            }
        }
        
        // 遍历所有绘制元素
        this.elements.forEach(element => {
            this.drawElementOnLED(element);
        });
    }

    drawElementOnLED(element) {
        const fill = element.getAttribute('fill') || '#ffffff';
        const colorClass = this.getColorClassFromHex(fill);
        
        if (element.tagName === 'rect') {
            const x = Math.round(parseFloat(element.getAttribute('x')) * 64 / 640);
            const y = Math.round(parseFloat(element.getAttribute('y')) * 32 / 320);
            const w = Math.max(1, Math.round(parseFloat(element.getAttribute('width')) * 64 / 640));
            const h = Math.max(1, Math.round(parseFloat(element.getAttribute('height')) * 32 / 320));
            
            for (let row = y; row < Math.min(32, y + h); row++) {
                for (let col = x; col < Math.min(64, x + w); col++) {
                    if (row >= 0 && col >= 0) {
                        const ledPixel = this.ledPixels[row][col];
                        ledPixel.classList.add('active');
                        if (colorClass) ledPixel.classList.add(colorClass);
                    }
                }
            }
        } else if (element.tagName === 'circle') {
            const cx = Math.round(parseFloat(element.getAttribute('cx')) * 64 / 640);
            const cy = Math.round(parseFloat(element.getAttribute('cy')) * 32 / 320);
            const r = Math.max(1, Math.round(parseFloat(element.getAttribute('r')) * Math.min(64, 32) / Math.min(640, 320)));
            
            for (let row = Math.max(0, cy - r); row <= Math.min(31, cy + r); row++) {
                for (let col = Math.max(0, cx - r); col <= Math.min(63, cx + r); col++) {
                    const distance = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2);
                    if (distance <= r) {
                        const ledPixel = this.ledPixels[row][col];
                        ledPixel.classList.add('active');
                        if (colorClass) ledPixel.classList.add(colorClass);
                    }
                }
            }
        } else if (element.tagName === 'text') {
            const x = Math.round(parseFloat(element.getAttribute('x')) * 64 / 640);
            const y = Math.round(parseFloat(element.getAttribute('y')) * 32 / 320);
            
            // 简单地在文字位置显示几个像素
            for (let row = Math.max(0, y - 1); row <= Math.min(31, y + 1); row++) {
                for (let col = Math.max(0, x); col <= Math.min(63, x + 3); col++) {
                    const ledPixel = this.ledPixels[row][col];
                    ledPixel.classList.add('active');
                    if (colorClass) ledPixel.classList.add(colorClass);
                }
            }
        }
    }

    getColorClassFromHex(hex) {
        // 将十六进制颜色转换为RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        return this.getColorClass(r, g, b);
    }

    // 在元素变更时更新LED显示
    saveCanvasState() {
        const elementsData = this.elements.map(element => {
            const data = {
                type: element.tagName,
                id: element.id,
                attributes: {}
            };

            // 保存所有属性
            for (let attr of element.attributes) {
                if (attr.name !== 'class') {
                    data.attributes[attr.name] = attr.value;
                }
            }

            // 保存文本内容
            if (element.tagName === 'text') {
                data.textContent = element.textContent;
            }

            return data;
        });

        this.canvasData[this.currentCanvas] = elementsData;
        
        // 延迟更新LED显示，避免过于频繁的更新
        if (this.ledUpdateEnabled) {
            clearTimeout(this.ledUpdateTimeout);
            this.ledUpdateTimeout = setTimeout(() => {
                this.updateLEDDisplay();
            }, 100);
        }
    }

    loadCanvas(canvasName) {
        // 清除当前画布
        this.clearCanvas();
        
        const data = this.canvasData[canvasName] || [];
        
        data.forEach(elementData => {
            const element = document.createElementNS('http://www.w3.org/2000/svg', elementData.type);
            element.id = elementData.id;

            // 恢复所有属性
            for (let [name, value] of Object.entries(elementData.attributes)) {
                element.setAttribute(name, value);
            }

            // 恢复文本内容
            if (elementData.textContent) {
                element.textContent = elementData.textContent;
            }

            this.addInteractivity(element);
            this.canvas.appendChild(element);
            this.elements.push(element);
        });

        this.currentCanvas = canvasName;
        document.getElementById('canvas-selector').value = canvasName;
    }

    clearCanvas() {
        // 清除所有元素（保留背景）
        this.elements.forEach(element => element.remove());
        this.elements = [];
        this.clearSelection();
    }

    switchCanvas(canvasName) {
        if (canvasName === this.currentCanvas) return;

        // 保存当前画布状态
        this.saveCanvasState();
        
        // 切换到新画布
        this.loadCanvas(canvasName);
    }

    createNewCanvas() {
        const name = prompt('请输入新画板名称:');
        if (!name || name.trim() === '') return;

        const canvasName = name.trim();
        if (this.canvasData[canvasName]) {
            alert('该名称已存在！');
            return;
        }

        // 保存当前画布状态
        this.saveCanvasState();

        // 创建新画布
        this.canvasData[canvasName] = [];
        this.updateCanvasSelector();
        this.loadCanvas(canvasName);
    }

    updateCanvasSelector() {
        const selector = document.getElementById('canvas-selector');
        selector.innerHTML = '';

        for (let canvasName in this.canvasData) {
            const option = document.createElement('option');
            option.value = canvasName;
            option.textContent = canvasName;
            selector.appendChild(option);
        }
    }

    saveCurrentCanvas() {
        this.saveCanvasState();
        this.exportCanvasData();
    }

    exportCanvasData() {
        const dataStr = JSON.stringify(this.canvasData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'drawing_data.json';
        link.click();
        
        alert('画板数据已保存到 drawing_data.json 文件！');
    }

    loadCanvasList() {
        this.updateCanvasSelector();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new DrawingApp();
});