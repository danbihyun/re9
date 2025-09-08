// =======================
// Canvas Drawing Tool - Offcanvas 버전
// =======================

// DOM
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

const gridToggle = document.getElementById("gridToggle");
const colorPicker = document.getElementById("colorPicker");
const brushSizeInput = document.getElementById("brushSize");
const toolSelect = document.getElementById("toolSelect");
const clearBtn = document.getElementById("clearBtn");
const savePngBtn = document.getElementById("savePngBtn");
const saveJpgBtn = document.getElementById("saveJpgBtn");

// Offcanvas DOM
const offcanvas = document.getElementById("offcanvas");
const canvasWrap = document.getElementById("canvasWrap");
const ocToggle = document.getElementById("ocToggle");
const ocClose = document.getElementById("ocClose");
const ocBackdrop = document.getElementById("ocBackdrop");

// State
let drawing = false;
let startX = 0, startY = 0;
let brushColor = colorPicker.value;
let brushSize = Number(brushSizeInput.value);
let currentTool = toolSelect.value || "pen";
let useGrid = false;
let ocOpen = false; // 오프캔버스 열린 상태

// ===== 유틸 =====
function setCompositeForTool(tool) {
  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = brushColor;
    ctx.fillStyle = brushColor;
  }
  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function takeSnapshot() {
  const snap = document.createElement("canvas");
  snap.width = canvas.width;
  snap.height = canvas.height;
  snap.getContext("2d").drawImage(canvas, 0, 0);
  return snap;
}

function restoreSnapshot(snapshot, scaleToFit = false) {
  if (!snapshot) return;
  if (scaleToFit) {
    ctx.drawImage(snapshot, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.drawImage(snapshot, 0, 0);
  }
}

function getPointerPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX ?? evt.touches?.[0]?.clientX) - rect.left;
  const y = (evt.clientY ?? evt.touches?.[0]?.clientY) - rect.top;
  return { x, y };
}

// ===== Offcanvas 제어 =====
function openOffcanvas() {
  ocOpen = true;
  offcanvas.classList.add("open");
  canvasWrap.classList.add("shift");
  ocBackdrop.classList.add("show");
  // 레이아웃이 변하므로 리사이즈
  resizeCanvas();
}
function closeOffcanvas() {
  ocOpen = false;
  offcanvas.classList.remove("open");
  canvasWrap.classList.remove("shift");
  ocBackdrop.classList.remove("show");
  resizeCanvas();
}
function toggleOffcanvas() {
  ocOpen ? closeOffcanvas() : openOffcanvas();
}

ocToggle.addEventListener("click", toggleOffcanvas);
ocClose.addEventListener("click", closeOffcanvas);
ocBackdrop.addEventListener("click", closeOffcanvas);

// 단축키: Ctrl+B
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "b")) {
    e.preventDefault();
    toggleOffcanvas();
  }
});

// ===== 레티나 대응 + 가용 공간 기준 리사이즈 =====
function resizeCanvas() {
  const snapshot = takeSnapshot();

  // 캔버스가 들어있는 래퍼의 실제 표시 영역을 읽어와서 정확히 맞춤
  const wrapRect = canvasWrap.getBoundingClientRect();
  const targetW = Math.max(240, Math.floor(wrapRect.width));
  const targetH = Math.max(240, Math.floor(wrapRect.height));

  const dpr = window.devicePixelRatio || 1;

  // CSS 크기(시각적)
  canvas.style.width = `${targetW}px`;
  canvas.style.height = `${targetH}px`;

  // 픽셀 버퍼
  canvas.width = Math.floor(targetW * dpr);
  canvas.height = Math.floor(targetH * dpr);

  // 좌표계를 CSS 픽셀 기준으로 보정
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 복원 (크기 달라졌으니 스케일 복원)
  restoreSnapshot(snapshot, true);
}
window.addEventListener("resize", resizeCanvas);

// 초기 패널 상태 (원하면 데스크톱에서 기본 open으로 바꿔도 됨)
closeOffcanvas();

// ===== 그리드 토글: CSS 클래스만 제어 =====
gridToggle.addEventListener("change", (e) => {
  useGrid = e.target.checked;
  canvas.classList.toggle("grid-on", useGrid);
});

// ===== 드로잉 =====
function onPointerDown(e) {
  e.preventDefault();
  drawing = true;

  const { x, y } = getPointerPos(e);
  startX = x;
  startY = y;

  if (currentTool === "pen" || currentTool === "eraser") {
    setCompositeForTool(currentTool);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  }
}

function onPointerMove(e) {
  if (!drawing) return;
  if (currentTool !== "pen" && currentTool !== "eraser") return;

  const { x, y } = getPointerPos(e);
  setCompositeForTool(currentTool);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function onPointerUp(e) {
  if (!drawing) return;
  drawing = false;

  const { x: endX, y: endY } = getPointerPos(e);
  setCompositeForTool(currentTool);

  if (currentTool === "line") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  } else if (currentTool === "rect") {
    ctx.strokeRect(startX, startY, endX - startX, endY - startY);
  } else if (currentTool === "circle") {
    const dx = endX - startX;
    const dy = endY - startY;
    const radius = Math.hypot(dx, dy);
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// 마우스 + 터치
canvas.addEventListener("mousedown", onPointerDown);
canvas.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);

canvas.addEventListener("touchstart", onPointerDown, { passive: false });
canvas.addEventListener("touchmove", onPointerMove, { passive: false });
window.addEventListener("touchend", onPointerUp);

// ===== 컨트롤 =====
colorPicker.addEventListener("input", (e) => {
  brushColor = e.target.value;
});

brushSizeInput.addEventListener("input", (e) => {
  brushSize = Number(e.target.value);
});

toolSelect.addEventListener("change", (e) => {
  currentTool = e.target.value;
  setCompositeForTool(currentTool);
});

// ===== Clear =====
clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ===== 저장 =====
function saveCanvas(type = "png") {
  const dpr = window.devicePixelRatio || 1;
  const cssW = parseFloat(getComputedStyle(canvas).width);
  const cssH = parseFloat(getComputedStyle(canvas).height);

  if (type === "png") {
    const link = document.createElement("a");
    link.download = "drawing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    return;
  }

  // JPEG: 흰 배경 합성
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = Math.floor(cssW * dpr);
  exportCanvas.height = Math.floor(cssH * dpr);

  const exCtx = exportCanvas.getContext("2d");
  exCtx.fillStyle = "#ffffff";
  exCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exCtx.drawImage(canvas, 0, 0);

  const link = document.createElement("a");
  link.download = "drawing.jpg";
  link.href = exportCanvas.toDataURL("image/jpeg", 0.92);
  link.click();
}

savePngBtn.addEventListener("click", () => saveCanvas("png"));
saveJpgBtn.addEventListener("click", () => saveCanvas("jpeg"));

// 초기 브러시/합성 설정 + 첫 리사이즈
setCompositeForTool(currentTool);
resizeCanvas();

// UX: 선택 방지
document.body.style.userSelect = "none";
