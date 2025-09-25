'use strict';

const GRID_WIDTH = 64;
const GRID_HEIGHT = 32;
const DEFAULT_COLOR = '#000000';

const pixelGrid = document.getElementById('pixelGrid');
const colorPicker = document.getElementById('colorPicker');
const colorPreview = document.getElementById('colorPreview');
const colorValueLabel = document.getElementById('colorValue');
const rgbInputs = {
    r: document.getElementById('rgbR'),
    g: document.getElementById('rgbG'),
    b: document.getElementById('rgbB'),
};
const applySelectionBtn = document.getElementById('applySelectionBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');
const exportBtn = document.getElementById('exportBtn');
const selectionInfo = document.getElementById('selectionInfo');
const drawnCountLabel = document.getElementById('drawnCount');
const fileNameInput = document.getElementById('fileNameInput');
const formatSelect = document.getElementById('formatSelect');
const previewArea = document.getElementById('previewArea');
const saveBoardBtn = document.getElementById('saveBoardBtn');
const loadBoardBtn = document.getElementById('loadBoardBtn');
const boardFileInput = document.getElementById('boardFileInput');
const boardLibrarySelect = document.getElementById('boardLibrarySelect');
const regionFillForm = document.getElementById('regionFillForm');
// 字模添加输入与按钮
const fontInputArea = document.getElementById('fontInputArea');
const addFontBtn = document.getElementById('addFontBtn');

// 本地字模库存储键名
const FONT_LIBRARY_KEY = 'rasterizer-font-library';

// 用于要素拖拽覆盖层
const overlayContainer = document.getElementById('overlayContainer');
// 元素预览列表容器
const elementPreviewList = document.getElementById('elementPreviewList');
let dragState = null;

const BOARD_LIBRARY_KEY = 'rasterizer-board-library';
// 元素管理
const elements = [];
let editingElementId = null;

const paletteButtons = Array.from(document.querySelectorAll('.palette-color'));

let currentColor = DEFAULT_COLOR;
const selectedPixels = new Set();
const pixelData = Array.from({ length: GRID_HEIGHT }, () => Array.from({ length: GRID_WIDTH }, () => DEFAULT_COLOR));
let drawnCount = 0;

function init() {
    createGrid();
    updateColorUI(currentColor);
    bindEvents();
    // 初始化本地字模列表
    renderFontLibraryList();
    initElementControls();
    refreshBoardLibrarySelect();
    updatePreview();
    renderFontLibraryList();
}

// Initialize element controls and list
function initElementControls() {
    const typeSelect = document.getElementById('elementTypeSelect');
    renderElementProps(typeSelect.value);
    renderElementList();
}

function createGrid() {
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
        for (let col = 0; col < GRID_WIDTH; col += 1) {
            const pixel = document.createElement('button');
            pixel.type = 'button';
            pixel.className = 'pixel';
            pixel.style.backgroundColor = DEFAULT_COLOR;
            pixel.dataset.row = row;
            pixel.dataset.col = col;
            pixel.setAttribute('aria-label', `像素 (${row + 1}, ${col + 1})`);
            pixel.addEventListener('click', (event) => handlePixelClick(event, pixel));
            fragment.appendChild(pixel);
        }
    }
    pixelGrid.appendChild(fragment);
}

function handlePixelClick(event, pixel) {
    const row = Number(pixel.dataset.row);
    const col = Number(pixel.dataset.col);

    if (event.ctrlKey || event.metaKey) {
        toggleSelection(pixel, row, col);
        return;
    }

    const targets = selectedPixels.size > 0
        ? Array.from(selectedPixels, (key) => {
            const [r, c] = key.split('-').map(Number);
            return getPixelElement(r, c);
        })
        : [pixel];

    applyColorToPixels(targets, currentColor);
    clearSelection();
}

function toggleSelection(pixel, row, col) {
    const key = `${row}-${col}`;
    if (selectedPixels.has(key)) {
        selectedPixels.delete(key);
        pixel.classList.remove('selected');
    } else {
        selectedPixels.add(key);
        pixel.classList.add('selected');
    }
    updateSelectionInfo();
}

function getPixelElement(row, col) {
    return pixelGrid.children[row * GRID_WIDTH + col];
}

function applyColorToPixels(pixels, color) {
    let updated = false;
    pixels.forEach((pixel) => {
        const row = Number(pixel.dataset.row);
        const col = Number(pixel.dataset.col);
        const previous = pixelData[row][col];
        if (previous !== color) {
            pixelData[row][col] = color;
            pixel.style.backgroundColor = color;
            if (previous === DEFAULT_COLOR && color !== DEFAULT_COLOR) {
                drawnCount += 1;
            } else if (previous !== DEFAULT_COLOR && color === DEFAULT_COLOR) {
                drawnCount = Math.max(0, drawnCount - 1);
            }
            updated = true;
        }
    });
    if (updated) {
        updateDrawnCount();
        updatePreview();
    }
}

function clearSelection() {
    selectedPixels.forEach((key) => {
        const [row, col] = key.split('-').map(Number);
        getPixelElement(row, col).classList.remove('selected');
    });
    selectedPixels.clear();
    updateSelectionInfo();
}

function updateSelectionInfo() {
    selectionInfo.textContent = `已选中: ${selectedPixels.size}`;
}

function updateDrawnCount() {
    drawnCountLabel.textContent = `已上色: ${drawnCount}`;
}

function updateColorUI(color) {
    currentColor = normalizeHex(color);
    colorPicker.value = currentColor;
    colorPreview.style.backgroundColor = currentColor;
    colorValueLabel.textContent = currentColor;

    const { r, g, b } = hexToRgb(currentColor);
    rgbInputs.r.value = r;
    rgbInputs.g.value = g;
    rgbInputs.b.value = b;

    paletteButtons.forEach((button) => {
        const match = button.dataset.color.toLowerCase() === currentColor.toLowerCase();
        button.classList.toggle('active', match);
    });
}

function bindEvents() {
    colorPicker.addEventListener('input', (event) => {
        updateColorUI(event.target.value);
    });

    Object.entries(rgbInputs).forEach(([channel, input]) => {
        input.addEventListener('input', () => {
            const value = clamp(Number.parseInt(input.value, 10) || 0, 0, 255);
            input.value = value;
            const hex = rgbToHex(
                Number(rgbInputs.r.value),
                Number(rgbInputs.g.value),
                Number(rgbInputs.b.value),
            );
            updateColorUI(hex);
        });
    });

    paletteButtons.forEach((button) => {
        button.addEventListener('click', () => {
            updateColorUI(button.dataset.color);
        });
    });

    applySelectionBtn.addEventListener('click', () => {
        if (selectedPixels.size === 0) {
            return;
        }
        const targets = Array.from(selectedPixels, (key) => {
            const [row, col] = key.split('-').map(Number);
            return getPixelElement(row, col);
        });
        applyColorToPixels(targets, currentColor);
        clearSelection();
    });

    clearSelectionBtn.addEventListener('click', () => {
        if (selectedPixels.size === 0) {
            return;
        }
        const targets = Array.from(selectedPixels, (key) => {
            const [row, col] = key.split('-').map(Number);
            return getPixelElement(row, col);
        });
        applyColorToPixels(targets, DEFAULT_COLOR);
        clearSelection();
    });

    clearCanvasBtn.addEventListener('click', () => {
        if (!window.confirm('确定要清空整个画布吗？该操作无法撤销。')) {
            return;
        }
        for (let row = 0; row < GRID_HEIGHT; row += 1) {
            for (let col = 0; col < GRID_WIDTH; col += 1) {
                pixelData[row][col] = DEFAULT_COLOR;
                getPixelElement(row, col).style.backgroundColor = DEFAULT_COLOR;
            }
        }
        drawnCount = 0;
        updateDrawnCount();
        clearSelection();
        updatePreview();
    });

    exportBtn.addEventListener('click', exportCurrentFont);

    saveBoardBtn.addEventListener('click', exportBoardSnapshot);

    loadBoardBtn.addEventListener('click', () => {
        boardFileInput.click();
    });

    boardFileInput.addEventListener('change', handleBoardFileSelection);

    if (boardLibrarySelect) {
        boardLibrarySelect.addEventListener('change', () => {
            // 自动保存当前画板及要素
            addSnapshotToLibrary(buildBoardSnapshot());
            const selectedId = boardLibrarySelect.value;
            if (!selectedId) {
                return;
            }
            const library = getBoardLibrary();
            const snapshot = library[selectedId];
            if (!snapshot) {
                window.alert('未找到所选画板，请刷新列表。');
                refreshBoardLibrarySelect();
                return;
            }
            applyBoardSnapshot(snapshot);
            refreshBoardLibrarySelect(selectedId);
        });
    }

    if (regionFillForm) {
        regionFillForm.addEventListener('submit', (event) => {
            event.preventDefault();
            handleRegionFillSubmit();
        });
    }
    // 字模添加事件
    if (addFontBtn && fontInputArea) {
        addFontBtn.addEventListener('click', handleAddFont);
    }

    // 元素添加
    const typeSelect = document.getElementById('elementTypeSelect');
    const propContainer = document.getElementById('elementProps');
    const addBtn = document.getElementById('addElementBtn');
    if (typeSelect && propContainer && addBtn) {
        typeSelect.addEventListener('change', () => renderElementProps(typeSelect.value));
        addBtn.addEventListener('click', () => handleAddOrUpdateElement());
    }

    window.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            exportCurrentFont();
        }
        if (event.key === 'Delete') {
            if (selectedPixels.size > 0) {
                const targets = Array.from(selectedPixels, (key) => {
                    const [row, col] = key.split('-').map(Number);
                    return getPixelElement(row, col);
                });
                applyColorToPixels(targets, DEFAULT_COLOR);
                clearSelection();
            }
        }
    });
}

function updatePreview() {
    const format = formatSelect.value;
    let previewText = '';
    switch (format) {
    case 'c-array':
        previewText = buildCArrayPreview();
        break;
    case 'plain':
    default:
        previewText = buildPlainPreview();
        break;
    }
    previewArea.value = previewText;
}

formatSelect.addEventListener('change', updatePreview);

function buildPlainPreview() {
    const lines = ['FONT64x32 RGB888', `WIDTH ${GRID_WIDTH}`, `HEIGHT ${GRID_HEIGHT}`, 'DATA'];
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
        const rowValues = [];
        for (let col = 0; col < GRID_WIDTH; col += 1) {
            rowValues.push(pixelData[row][col].slice(1).toUpperCase());
        }
        lines.push(rowValues.join(' '));
    }
    return lines.join('\n');
}

function buildCArrayPreview() {
    const lines = [];
    lines.push(`const uint32_t FONT_64x32[${GRID_HEIGHT}][${GRID_WIDTH}] = {`);
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
        const rowValues = [];
        for (let col = 0; col < GRID_WIDTH; col += 1) {
            rowValues.push(`0x${pixelData[row][col].slice(1).toUpperCase()}`);
        }
        lines.push(`    { ${rowValues.join(', ')} },`);
    }
    lines.push('};');
    return lines.join('\n');
}

function exportCurrentFont() {
    const format = formatSelect.value;
    let content = '';
    let extension = 'txt';

    switch (format) {
    case 'c-array':
        content = buildCArrayPreview();
        extension = 'c';
        break;
    case 'plain':
    default:
        content = buildPlainPreview();
        extension = 'txt';
        break;
    }

    const baseName = sanitizeFileName(fileNameInput.value) || 'font64x32';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${baseName}-${timestamp}.${extension}`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

function exportBoardSnapshot() {
    try {
        const snapshot = buildBoardSnapshot();
        const libraryId = addSnapshotToLibrary(snapshot);
        refreshBoardLibrarySelect(libraryId);
        const baseName = sanitizeFileName(snapshot.name) || 'font64x32-board';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${baseName}-${timestamp}.board.json`;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('导出画板失败:', error);
        window.alert('导出画板失败，请稍后重试。');
    }
}

async function handleBoardFileSelection(event) {
    const { files } = event.target;
    if (!files || files.length === 0) {
        return;
    }

    const [file] = files;
    try {
        const text = await file.text();
        const snapshot = JSON.parse(text);
        applyBoardSnapshot(snapshot);
        const libraryId = addSnapshotToLibrary(snapshot);
        refreshBoardLibrarySelect(libraryId);
    } catch (error) {
        console.error('导入画板失败:', error);
        window.alert('导入画板失败，请确认文件格式正确。');
    } finally {
        boardFileInput.value = '';
    }
}

function buildBoardSnapshot() {
    return {
        schema: 'rasterizer-board@1.0',
        createdAt: new Date().toISOString(),
        grid: {
            width: GRID_WIDTH,
            height: GRID_HEIGHT,
        },
        name: fileNameInput.value.trim(),
        currentColor,
        pixels: pixelData.map((row) => row.map((color) => normalizeHex(color))),
        elements: JSON.parse(JSON.stringify(elements))
    };
}

function applyBoardSnapshot(snapshot) {
    if (!isValidBoardSnapshot(snapshot)) {
        throw new Error('无效的画板文件结构');
    }

    let newDrawnCount = 0;

    for (let row = 0; row < GRID_HEIGHT; row += 1) {
        for (let col = 0; col < GRID_WIDTH; col += 1) {
            const rawColor = snapshot.pixels[row][col] ?? DEFAULT_COLOR;
            const normalized = normalizeHex(rawColor);
            pixelData[row][col] = normalized;
            getPixelElement(row, col).style.backgroundColor = normalized;
            if (normalized !== DEFAULT_COLOR) {
                newDrawnCount += 1;
            }
        }
    }

    drawnCount = newDrawnCount;
    updateDrawnCount();
    clearSelection();

    if (typeof snapshot.name === 'string' && snapshot.name.trim()) {
        fileNameInput.value = snapshot.name.trim();
    }

    const nextColor = typeof snapshot.currentColor === 'string'
        ? snapshot.currentColor
        : currentColor;
    updateColorUI(nextColor);
    updatePreview();
    // 恢复要素列表
    elements.length = 0;
    if (Array.isArray(snapshot.elements)) {
        snapshot.elements.forEach(e => elements.push(e));
    }
    renderElementList();
    // 叠加渲染要素而不重置像素
    elements.forEach(elem => {
        if (elem.type === 'rectangle') {
            for (let dr = 0; dr < elem.h; dr++) {
                for (let dc = 0; dc < elem.w; dc++) {
                    const r = elem.y - 1 + dr;
                    const c = elem.x - 1 + dc;
                    if (r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH) {
                        pixelData[r][c] = elem.color;
                        getPixelElement(r, c).style.backgroundColor = elem.color;
                    }
                }
            }
        } else if (elem.type === 'circle') {
            for (let r = 0; r < GRID_HEIGHT; r++) {
                for (let c = 0; c < GRID_WIDTH; c++) {
                    const dx = c + 1 - elem.cx;
                    const dy = r + 1 - elem.cy;
                    if (dx * dx + dy * dy <= elem.r * elem.r) {
                        pixelData[r][c] = elem.color;
                        getPixelElement(r, c).style.backgroundColor = elem.color;
                    }
                }
            }
        } else if (elem.type === 'text') {
            // TODO: 字体取模渲染逻辑待实现
        }
    });
    // 更新统计和预览
    drawnCount = pixelData.flat().filter(color => color !== DEFAULT_COLOR).length;
    updateDrawnCount();
    updatePreview();
}

function isValidBoardSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return false;
    }
    if (!snapshot.grid || snapshot.grid.width !== GRID_WIDTH || snapshot.grid.height !== GRID_HEIGHT) {
        return false;
    }
    if (!Array.isArray(snapshot.pixels) || snapshot.pixels.length !== GRID_HEIGHT) {
        return false;
    }
    return snapshot.pixels.every((row) => Array.isArray(row) && row.length === GRID_WIDTH);
}

function handleRegionFillSubmit() {
    if (!startXInput || !startYInput || !endXInput || !endYInput) {
        return;
    }

    const startX = readCoordinateInput(startXInput, 1, GRID_WIDTH);
    const startY = readCoordinateInput(startYInput, 1, GRID_HEIGHT);
    const endX = readCoordinateInput(endXInput, 1, GRID_WIDTH);
    const endY = readCoordinateInput(endYInput, 1, GRID_HEIGHT);

    if ([startX, startY, endX, endY].some((value) => value === null)) {
        window.alert('请输入有效的坐标（整数）');
        return;
    }

    const minX = Math.min(startX, endX) - 1;
    const maxX = Math.max(startX, endX) - 1;
    const minY = Math.min(startY, endY) - 1;
    const maxY = Math.max(startY, endY) - 1;

    const targets = [];
    for (let row = minY; row <= maxY; row += 1) {
        for (let col = minX; col <= maxX; col += 1) {
            targets.push(getPixelElement(row, col));
        }
    }

    if (targets.length === 0) {
        return;
    }

    applyColorToPixels(targets, currentColor);
    clearSelection();
}

function readCoordinateInput(input, min, max) {
    const raw = Number.parseInt(input.value, 10);
    if (Number.isNaN(raw)) {
        return null;
    }
    const clamped = clamp(raw, min, max);
    if (clamped !== raw) {
        input.value = clamped;
    }
    return clamped;
}

function getBoardLibrary() {
    try {
        const storage = window.localStorage;
        if (!storage) {
            return {};
        }
        const raw = storage.getItem(BOARD_LIBRARY_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch (error) {
        console.warn('读取画板库失败:', error);
    }
    return {};
}

function setBoardLibrary(library) {
    try {
        const storage = window.localStorage;
        if (!storage) {
            return;
        }
        storage.setItem(BOARD_LIBRARY_KEY, JSON.stringify(library));
    } catch (error) {
        console.warn('保存画板库失败:', error);
    }
}

// 获取本地字模库
function getFontLibrary() {
    try {
        const raw = window.localStorage.getItem(FONT_LIBRARY_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('读取字模库失败', e);
        return {};
    }
}

// 保存本地字模库
function setFontLibrary(lib) {
    try {
        window.localStorage.setItem(FONT_LIBRARY_KEY, JSON.stringify(lib));
    } catch (e) {
        console.warn('保存字模库失败', e);
    }
}

// 解析字模输入，返回字符和按行的二维数据
function parseFontInput(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) {
        throw new Error('请输入字符行和两行数据');
    }
    // 第一行为字符定义，如 测(0)
    const charMatch = lines[0].match(/^(.+?)\s*\(\d+\)$/);
    const char = charMatch ? charMatch[1] : lines[0];
    // 剩余大括号数组行
    const dataRows = lines.slice(1).map(line => {
        const m = line.match(/\{([\s\S]*?)\}/);
        if (!m) throw new Error('无法解析数据行: ' + line);
        return m[1].split(',').map(s => s.trim()).filter(Boolean).map(s => parseInt(s, 16));
    });
    return { char, rows: dataRows };
}

// 处理添加字模
function handleAddFont() {
    const text = fontInputArea.value;
    try {
        const { char, bitmap } = parseFontInput(text);
        const lib = getFontLibrary();
        // 唯一键
        const id = char + '-' + Date.now();
        lib[id] = { id, char, bitmap };
        setFontLibrary(lib);
    window.alert(`字模【${char}】添加成功！`);
    fontInputArea.value = '';
    // 刷新本地字模列表
    renderFontLibraryList();
    } catch (e) {
        console.error(e);
        window.alert('添加字模失败: ' + e.message);
    }
}

/** 渲染本地字模列表，并添加「贴上」按钮 */
function renderFontLibraryList() {
    const container = document.getElementById('fontLibraryList');
    if (!container) return;
    container.innerHTML = '';
    const lib = getFontLibrary();
    Object.values(lib).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'font-library-item';
        item.textContent = entry.char;
        const btn = document.createElement('button');
        btn.textContent = '贴上';
        btn.addEventListener('click', () => {
            applyFontToGrid(entry);
        });
        item.appendChild(btn);
        container.appendChild(item);
    });
}

/** 将字模贴在绘图区，默认左上角(1,1)开始 */
function applyFontToGrid(entry, startRow = 1, startCol = 1) {
    const color = currentColor;
    entry.rows.forEach((rowData, r) => {
        rowData.forEach((val, c) => {
            if (val) {
                const rr = startRow - 1 + r;
                const cc = startCol - 1 + c;
                if (rr >= 0 && rr < GRID_HEIGHT && cc >= 0 && cc < GRID_WIDTH) {
                    pixelData[rr][cc] = color;
                    getPixelElement(rr, cc).style.backgroundColor = color;
                }
            }
        });
    });
    // 更新统计和预览
    drawnCount = pixelData.flat().filter(col => col !== DEFAULT_COLOR).length;
    updateDrawnCount();
    updatePreview();
}

function addSnapshotToLibrary(snapshot) {
    try {
        const library = getBoardLibrary();
        const normalizedName = typeof snapshot.name === 'string' ? snapshot.name.trim() : '';
        let existingId = null;
        if (normalizedName) {
            existingId = Object.values(library).find((entry) => entry.name === normalizedName)?.id ?? null;
        }
        const id = existingId || snapshot.id || generateSnapshotId();
        const entry = {
            ...snapshot,
            id,
            name: normalizedName || `未命名画板 ${new Date().toLocaleString()}`,
            savedAt: new Date().toISOString(),
        };
        library[id] = entry;
        setBoardLibrary(library);
        return id;
    } catch (error) {
        console.warn('添加画板到库失败:', error);
    }
    return null;
}

function refreshBoardLibrarySelect(selectedId = null) {
    if (!boardLibrarySelect) {
        return;
    }
    let storageAvailable = true;
    try {
        if (!window.localStorage) {
            storageAvailable = false;
        }
    } catch (error) {
        storageAvailable = false;
    }

    if (!storageAvailable) {
        boardLibrarySelect.innerHTML = '';
        const option = document.createElement('option');
        option.textContent = '浏览器不支持画板库';
        option.value = '';
        option.disabled = true;
        option.selected = true;
        boardLibrarySelect.appendChild(option);
        boardLibrarySelect.disabled = true;
        return;
    }

    const library = getBoardLibrary();
    const entries = Object.values(library).sort((a, b) => new Date(b.savedAt || b.createdAt || 0) - new Date(a.savedAt || a.createdAt || 0));
    boardLibrarySelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = entries.length ? '选择画板…' : '暂无保存的画板';
    placeholder.disabled = true;
    placeholder.selected = !selectedId;
    boardLibrarySelect.appendChild(placeholder);

    entries.forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = buildSnapshotOptionLabel(entry);
        if (entry.id === selectedId) {
            option.selected = true;
        }
        boardLibrarySelect.appendChild(option);
    });

    boardLibrarySelect.disabled = entries.length === 0;
}

function buildSnapshotOptionLabel(entry) {
    const name = entry.name || '未命名画板';
    const time = entry.savedAt || entry.createdAt;
    try {
        if (time) {
            const date = new Date(time);
            if (!Number.isNaN(date.getTime())) {
                return `${name} (${date.toLocaleString()})`;
            }
        }
    } catch (error) {
        // ignore formatting errors
    }
    return name;
}

function generateSnapshotId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `board-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function hexToRgb(hex) {
    const normalized = normalizeHex(hex).replace('#', '');
    const intVal = Number.parseInt(normalized, 16);
    return {
        r: (intVal >> 16) & 0xFF,
        g: (intVal >> 8) & 0xFF,
        b: intVal & 0xFF,
    };
}

function rgbToHex(r, g, b) {
    const clampChannel = (value) => clamp(value, 0, 255).toString(16).padStart(2, '0');
    return `#${clampChannel(r)}${clampChannel(g)}${clampChannel(b)}`.toUpperCase();
}

function normalizeHex(hex) {
    let value = hex.trim();
    if (!value.startsWith('#')) {
        value = `#${value}`;
    }
    if (value.length === 4) {
        value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }
    return value.substring(0, 7).toUpperCase();
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function sanitizeFileName(name) {
    return name.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Element management functions
function initElementControls() {
    const typeSelect = document.getElementById('elementTypeSelect');
    if (typeSelect) {
        renderElementProps(typeSelect.value);
    }
    renderElementList();
}

function renderElementProps(type) {
    const container = document.getElementById('elementProps');
    if (!container) return;
    container.innerHTML = '';
    if (type === 'rectangle') {
        container.innerHTML = `
            <label>X: <input type="number" id="elemX" min="1" max="64" value="1"></label>
            <label>Y: <input type="number" id="elemY" min="1" max="32" value="1"></label>
            <label>宽度: <input type="number" id="elemW" min="1" max="64" value="8"></label>
            <label>高度: <input type="number" id="elemH" min="1" max="32" value="8"></label>
        `;
    } else if (type === 'circle') {
        container.innerHTML = `
            <label>中心 X: <input type="number" id="elemCX" min="1" max="64" value="16"></label>
            <label>中心 Y: <input type="number" id="elemCY" min="1" max="32" value="16"></label>
            <label>半径: <input type="number" id="elemR" min="1" max="32" value="8"></label>
        `;
    } else if (type === 'text') {
        container.innerHTML = `
            <label>文字: <input type="text" id="elemText" maxlength="1" value="A"></label>
            <label>X: <input type="number" id="elemX" min="1" max="64" value="1"></label>
            <label>Y: <input type="number" id="elemY" min="1" max="32" value="1"></label>
        `;
    }
}

function handleAddOrUpdateElement() {
    const type = document.getElementById('elementTypeSelect').value;
    const elem = { id: editingElementId || `${type}-${Date.now()}`, type, color: currentColor };
    if (type === 'rectangle') {
        elem.x = parseInt(document.getElementById('elemX').value, 10);
        elem.y = parseInt(document.getElementById('elemY').value, 10);
        elem.w = parseInt(document.getElementById('elemW').value, 10);
        elem.h = parseInt(document.getElementById('elemH').value, 10);
    } else if (type === 'circle') {
        elem.cx = parseInt(document.getElementById('elemCX').value, 10);
        elem.cy = parseInt(document.getElementById('elemCY').value, 10);
        elem.r = parseInt(document.getElementById('elemR').value, 10);
    } else if (type === 'text') {
        elem.text = document.getElementById('elemText').value;
        elem.x = parseInt(document.getElementById('elemX').value, 10);
        elem.y = parseInt(document.getElementById('elemY').value, 10);
    }
    if (editingElementId) {
        const idx = elements.findIndex(e => e.id === editingElementId);
        if (idx !== -1) elements[idx] = elem;
        editingElementId = null;
        document.getElementById('addElementBtn').textContent = '添加要素';
    } else {
        elements.push(elem);
    }
    renderElementList();
    redrawAll();
}

/**
 * 渲染要素列表
 */
function renderElementList() {
    const list = document.getElementById('elementList');
    if (!list) return;
    list.innerHTML = '';
    elements.forEach(elem => {
        const li = document.createElement('li');
        li.textContent = `[${elem.type}] ${elem.id}`;
        const editBtn = document.createElement('button'); editBtn.textContent = '编辑';
        editBtn.addEventListener('click', () => {
            editingElementId = elem.id;
            document.getElementById('elementTypeSelect').value = elem.type;
            renderElementProps(elem.type);
            if (elem.type === 'rectangle') {
                document.getElementById('elemX').value = elem.x;
                document.getElementById('elemY').value = elem.y;
                document.getElementById('elemW').value = elem.w;
                document.getElementById('elemH').value = elem.h;
            } else if (elem.type === 'circle') {
                document.getElementById('elemCX').value = elem.cx;
                document.getElementById('elemCY').value = elem.cy;
                document.getElementById('elemR').value = elem.r;
            } else {
                document.getElementById('elemText').value = elem.text;
                document.getElementById('elemX').value = elem.x;
                document.getElementById('elemY').value = elem.y;
            }
            document.getElementById('addElementBtn').textContent = '更新要素';
        });
        const delBtn = document.createElement('button'); delBtn.textContent = '删除';
        delBtn.addEventListener('click', () => {
            const idx = elements.findIndex(e => e.id === elem.id);
            if (idx !== -1) elements.splice(idx, 1);
            renderElementList();
            redrawAll();
        });
        li.appendChild(editBtn);
        li.appendChild(delBtn);
        list.appendChild(li);
    });
    // 渲染预览列表
    renderElementPreviews();
}

/**
 * 渲染要素预览列表
 */
function renderElementPreviews() {
    if (!elementPreviewList) return;
    elementPreviewList.innerHTML = '';
    elements.forEach(elem => {
        const item = document.createElement('div');
        item.className = 'element-preview-item';
        item.dataset.id = elem.id;
        item.title = `${elem.type}`;
        // 基本样式
        item.style.width = '24px';
        item.style.height = '24px';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'center';
        // 根据类型渲染
        if (elem.type === 'rectangle') {
            item.style.backgroundColor = elem.color;
        } else if (elem.type === 'circle') {
            item.style.backgroundColor = elem.color;
            item.style.borderRadius = '50%';
        } else if (elem.type === 'text') {
            const span = document.createElement('span');
            span.textContent = elem.text;
            span.style.color = elem.color;
            span.style.fontWeight = 'bold';
            item.appendChild(span);
        }
        // 点击选择编辑
        item.addEventListener('click', () => {
            // 高亮
            elementPreviewList.querySelectorAll('.element-preview-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            // 填充属性表单并切换到编辑模式
            editingElementId = elem.id;
            document.getElementById('elementTypeSelect').value = elem.type;
            renderElementProps(elem.type);
            if (elem.type === 'rectangle') {
                document.getElementById('elemX').value = elem.x;
                document.getElementById('elemY').value = elem.y;
                document.getElementById('elemW').value = elem.w;
                document.getElementById('elemH').value = elem.h;
            } else if (elem.type === 'circle') {
                document.getElementById('elemCX').value = elem.cx;
                document.getElementById('elemCY').value = elem.cy;
                document.getElementById('elemR').value = elem.r;
            } else if (elem.type === 'text') {
                document.getElementById('elemText').value = elem.text;
                document.getElementById('elemX').value = elem.x;
                document.getElementById('elemY').value = elem.y;
            }
            document.getElementById('addElementBtn').textContent = '更新要素';
        });
        elementPreviewList.appendChild(item);
    });
}

/**
 * 在像素网格上渲染可拖拽的要素覆盖层
 */
function renderElementOverlays() {
    if (!overlayContainer) return;
    // 清空已有覆盖层
    overlayContainer.innerHTML = '';
    // 获取像素尺寸和间距
    const gridStyles = getComputedStyle(pixelGrid);
    const pixelSize = parseInt(gridStyles.getPropertyValue('--pixel-size'));
    const pixelGap = parseInt(gridStyles.getPropertyValue('--pixel-gap'));
    elements.forEach(elem => {
        const div = document.createElement('div');
        div.dataset.id = elem.id;
        div.style.position = 'absolute';
        div.style.cursor = 'move';
        // 计算位置和尺寸
        const cellWidth = pixelSize + pixelGap;
        let x = 0, y = 0, w = 1, h = 1;
        if (elem.type === 'rectangle') {
            x = elem.x - 1; y = elem.y - 1; w = elem.w; h = elem.h;
        } else if (elem.type === 'circle' || elem.type === 'text') {
            // 将圆形和文本按单元格捕获为1x1或圆圈外围包围框
            x = elem.type === 'circle' ? elem.cx - 1 : elem.x - 1;
            y = elem.type === 'circle' ? elem.cy - 1 : elem.y - 1;
            w = 1; h = 1;
        }
        div.style.left = `${x * cellWidth}px`;
        div.style.top = `${y * cellWidth}px`;
        div.style.width = `${w * pixelSize + (w - 1) * pixelGap}px`;
        div.style.height = `${h * pixelSize + (h - 1) * pixelGap}px`;
        div.style.border = '2px dashed var(--primary)';
        // 允许鼠标事件
        div.style.pointerEvents = 'auto';
        // 拖拽事件
        div.addEventListener('mousedown', e => {
            e.preventDefault();
            dragState = {
                id: elem.id,
                startX: e.clientX,
                startY: e.clientY,
                origLeft: parseInt(div.style.left),
                origTop: parseInt(div.style.top)
            };
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
        });
        overlayContainer.appendChild(div);
    });
}

function onDragMove(e) {
    if (!dragState) return;
    const { startX, startY, origLeft, origTop, id } = dragState;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const div = overlayContainer.querySelector(`div[data-id="${id}"]`);
    if (div) {
        div.style.left = `${origLeft + dx}px`;
        div.style.top = `${origTop + dy}px`;
    }
}

function onDragEnd(e) {
    if (!dragState) return;
    const { origLeft, origTop, id } = dragState;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    // 计算新单元格坐标
    const gridStyles = getComputedStyle(pixelGrid);
    const pixelSize = parseInt(gridStyles.getPropertyValue('--pixel-size'));
    const pixelGap = parseInt(gridStyles.getPropertyValue('--pixel-gap'));
    const cellWidth = pixelSize + pixelGap;
    const div = overlayContainer.querySelector(`div[data-id="${id}"]`);
    if (div) {
        const left = parseInt(div.style.left);
        const top = parseInt(div.style.top);
        const newX = Math.round(left / cellWidth) + 1;
        const newY = Math.round(top / cellWidth) + 1;
        // 更新元素数据
        const elem = elements.find(e => e.id === id);
        if (elem) {
            if (elem.type === 'rectangle' || elem.type === 'text') {
                elem.x = newX;
                elem.y = newY;
            } else if (elem.type === 'circle') {
                elem.cx = newX;
                elem.cy = newY;
            }
            renderElementList();
            redrawAll();
        }
    }
    dragState = null;
}

// 在重绘结束后渲染覆盖层
function redrawAll() {
    // 清空画布
    pixelData.forEach((row, r) => row.forEach((_, c) => {
        pixelData[r][c] = DEFAULT_COLOR;
        getPixelElement(r, c).style.backgroundColor = DEFAULT_COLOR;
    }));
    // 重新渲染
    elements.forEach(elem => {
        if (elem.type === 'rectangle') {
            for (let dr = 0; dr < elem.h; dr++) {
                for (let dc = 0; dc < elem.w; dc++) {
                    const r = elem.y - 1 + dr;
                    const c = elem.x - 1 + dc;
                    if (r >= 0 && r < GRID_HEIGHT && c >= 0 && c < GRID_WIDTH) {
                        pixelData[r][c] = elem.color;
                        getPixelElement(r, c).style.backgroundColor = elem.color;
                    }
                }
            }
        } else if (elem.type === 'circle') {
            for (let r = 0; r < GRID_HEIGHT; r++) {
                for (let c = 0; c < GRID_WIDTH; c++) {
                    const dx = c + 1 - elem.cx;
                    const dy = r + 1 - elem.cy;
                    if (dx * dx + dy * dy <= elem.r * elem.r) {
                        pixelData[r][c] = elem.color;
                        getPixelElement(r, c).style.backgroundColor = elem.color;
                    }
                }
            }
        }
    });
    // 更新统计
    drawnCount = elements.reduce((acc, e) => {
    if (e.type === 'rectangle') return acc + e.w * e.h;
    if (e.type === 'circle') return acc + Math.round(Math.PI * e.r * e.r);
        return acc;
    }, 0);
    updateDrawnCount();
    updatePreview();
    renderElementOverlays();
}

init();
