// ============================================================
// renderer.js — Drawing primitives (shared by all render modules)
// ============================================================

let ctx = null;

export function initRenderer(context) { ctx = context; }
export function getCtx() { return ctx; }

export function drawText(text, x, y, size, color, align = 'left', font = 'sans-serif') {
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

export function drawRect(x, y, w, h, color, radius = 0) {
  ctx.fillStyle = color;
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

export function drawBar(x, y, w, h, pct, bgColor, fillColor, radius = 4) {
  drawRect(x, y, w, h, bgColor, radius);
  if (pct > 0) drawRect(x, y, Math.max(h, w * pct), h, fillColor, radius);
}

export function drawOutline(x, y, w, h, color, lineWidth = 2, radius = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.stroke();
  } else {
    ctx.strokeRect(x, y, w, h);
  }
}
