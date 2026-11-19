// Builds small canvas-drawn marker icons per alert level, so each level has
// its own shape as well as its own colour (docs/claude.md Design section:
// colour is never the only signal).
import type { Level } from "./types";
import { LEVEL_COLORS } from "./types";

const SIZE = 28;

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  return { canvas, ctx };
}

function drawCircle(ctx: CanvasRenderingContext2D, color: string, filled: boolean, dotted: boolean) {
  const r = SIZE / 2 - 3;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  if (dotted) ctx.setLineDash([3, 3]);
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.stroke();
}

function drawTriangle(ctx: CanvasRenderingContext2D, color: string) {
  const pad = 3;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, pad);
  ctx.lineTo(SIZE - pad, SIZE - pad);
  ctx.lineTo(pad, SIZE - pad);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawSquare(ctx: CanvasRenderingContext2D, color: string) {
  const pad = 4;
  ctx.fillStyle = color;
  ctx.fillRect(pad, pad, SIZE - pad * 2, SIZE - pad * 2);
}

function drawDiamond(ctx: CanvasRenderingContext2D, color: string, hatch: boolean) {
  const pad = 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, pad);
  ctx.lineTo(SIZE - pad, SIZE / 2);
  ctx.lineTo(SIZE / 2, SIZE - pad);
  ctx.lineTo(pad, SIZE / 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (hatch) {
    ctx.clip();
    ctx.strokeStyle = "#f6f4ef";
    ctx.lineWidth = 1.5;
    for (let x = -SIZE; x < SIZE * 2; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + SIZE, SIZE);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function buildMarkerIcon(level: Level): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  const color = LEVEL_COLORS[level];
  switch (level) {
    case "NORMAL":
      drawCircle(ctx, color, true, false);
      break;
    case "WATCH":
      drawTriangle(ctx, color);
      break;
    case "WARNING":
      drawSquare(ctx, color);
      break;
    case "SEVERE":
      drawDiamond(ctx, color, true);
      break;
    case "NO_SIGNAL":
      drawCircle(ctx, color, false, true);
      break;
  }
  return canvas;
}
