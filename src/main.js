// ===== DOM 참조 =====
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

// 컨트롤
const colorPicker   = document.getElementById("colorPicker");
const brushSizeInput= document.getElementById("brushSize");
const toolSelect    = document.getElementById("toolSelect");
const gridToggle    = document.getElementById("gridToggle");
const clearBtn      = document.getElementById("clearBtn");
const savePngBtn    = document.getElementById("savePngBtn");
const saveJpgBtn    = document.getElementById("saveJpgBtn");

// 사이드바(있으면 사용, 없으면 무시)
const sidebarToggle = document.getElementById("sidebarToggle"); // 햄버거 버튼
const sidebar       = document.getElementById("sidebar");
const overlay       = document.getElementById("overlay");
const mainArea      = document.getElementById("mainArea");

// ===== 상태 =====
let drawing    = false;
let startX = 0, startY = 0;
let brushColor = (colorPicker && colorPicker.value) || "#000000";
let brushSize  = (brushSizeInput && Number(brushSizeInput.value)) || 5;
let currentTool= (toolSelect && toolSelect.value) || "pen";

// ===== 유틸 =====
function setCompositeForTool(tool) {
  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out"; // 투명 지우개
  } else {
    ctx.globalCompositeOperation = "source-over";     // 일반 그리기
    ctx.strokeStyle = brushColor;
    ctx.fillStyle   = brushColor;
  }
  ctx.lineWidth = brushSize;
  ctx.lineCap   = "round";
  ctx.lineJoin  = "round";
}

function getPointerPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function takeSnapshot() {
  const snap = document.createElement("canvas");
  snap.width = canvas.width;
  snap.height= canvas.height;
  snap.getContext("2d").drawImage(canvas, 0, 0);
  return snap;
}
function restoreSnapshot(snap, scale = false) {
  if (!snap) return;
  if (scale) ctx.drawImage(snap, 0, 0, canvas.width, canvas.height);
  else       ctx.drawImage(snap, 0, 0);
}

// ===== 리사이즈 (DPR 대응) =====
function resizeCanvas() {
  const snapshot = takeSnapshot();

  const sizeRoot = mainArea || canvas.parentElement || document.body;
  const r = sizeRoot.getBoundingClientRect();
  const targetW = Math.max(240, Math.floor(r.width));
  const targetH = Math.max(240, Math.floor(r.height));

  const dpr = window.devicePixelRatio || 1;

  canvas.style.width  = `${targetW}px`;
  canvas.style.height = `${targetH}px`;
  canvas.width  = Math.floor(targetW * dpr);
  canvas.height = Math.floor(targetH * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  restoreSnapshot(snapshot, true);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // 초기 1회

// ===== 모눈종이 (JS로 직접 background 세팅) =====
function setGridBackground(on, spacing = 25, color = "#e0e0e0") {
  if (on) {
    canvas.style.backgroundImage =
      `linear-gradient(${color} 1px, transparent 1px),` +
      `linear-gradient(90deg, ${color} 1px, transparent 1px)`;
    canvas.style.backgroundSize = `${spacing}px ${spacing}px`;
    canvas.style.backgroundColor = "#ffffff";
  } else {
    // 기본 흰 배경 유지
    canvas.style.backgroundImage = "none";
    canvas.style.backgroundColor = "#ffffff";
  }
}

// 체크박스 이벤트
if (gridToggle) {
  gridToggle.addEventListener("change", (e) => {
    setGridBackground(e.target.checked);
  });
}

// ===== 드로잉 =====
function onPointerDown(e) {
  e.preventDefault();
  drawing = true;
  const { x, y } = getPointerPos(e);
  startX = x; startY = y;

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
    const dx = endX - startX, dy = endY - startY;
    const radius = Math.hypot(dx, dy);
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// 이벤트 등록 (마우스+터치)
canvas.addEventListener("mousedown", onPointerDown);
canvas.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);
canvas.addEventListener("touchstart", onPointerDown, { passive: false });
canvas.addEventListener("touchmove", onPointerMove, { passive: false });
window.addEventListener("touchend", onPointerUp);

// ===== 컨트롤 =====
if (colorPicker) colorPicker.addEventListener("input", (e)=> { brushColor = e.target.value; });
if (brushSizeInput) brushSizeInput.addEventListener("input", (e)=> { brushSize = Number(e.target.value); });
if (toolSelect) toolSelect.addEventListener("change", (e)=> { currentTool = e.target.value; setCompositeForTool(currentTool); });

// Clear
if (clearBtn) clearBtn.addEventListener("click", ()=> {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Save
function saveCanvas(type = "png") {
  const dpr = window.devicePixelRatio || 1;
  const cssW = parseFloat(getComputedStyle(canvas).width);
  const cssH = parseFloat(getComputedStyle(canvas).height);

  if (type === "png") {
    const a = document.createElement("a");
    a.download = "drawing.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    return;
  }

  // jpeg: 흰 배경 합성
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width  = Math.floor(cssW * dpr);
  exportCanvas.height = Math.floor(cssH * dpr);
  const ex = exportCanvas.getContext("2d");
  ex.fillStyle = "#ffffff";
  ex.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  ex.drawImage(canvas, 0, 0);

  const a = document.createElement("a");
  a.download = "drawing.jpg";
  a.href = exportCanvas.toDataURL("image/jpeg", 0.92);
  a.click();
}
if (savePngBtn) savePngBtn.addEventListener("click", () => saveCanvas("png"));
if (saveJpgBtn) saveJpgBtn.addEventListener("click", () => saveCanvas("jpeg"));

// ===== 사이드바 토글(있을 때만) =====
if (sidebar && overlay && sidebarToggle && mainArea) {
  function openSidebar(){
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    mainArea.classList.add("ml-64");
    resizeCanvas();
  }
  function closeSidebar(){
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    mainArea.classList.remove("ml-64");
    resizeCanvas();
  }
  function toggleSidebar(){
    sidebar.classList.contains("-translate-x-full") ? openSidebar() : closeSidebar();
  }
  sidebarToggle.addEventListener("click", toggleSidebar);
  overlay.addEventListener("click", closeSidebar);
}

// 초기 설정
setCompositeForTool(currentTool);
document.body.style.userSelect = "none"; // 드래그 중 텍스트 선택 방지
