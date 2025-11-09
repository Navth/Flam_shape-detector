import type { Point } from "./main.js";

/**
 * Calculate perpendicular distance from a point to a line segment
 * @param p - The point to measure distance from
 * @param l1 - First endpoint of the line segment
 * @param l2 - Second endpoint of the line segment
 * @returns The perpendicular distance
 */
export function perpendicularDistance(p: Point, l1: Point, l2: Point): number {
  const { x, y } = p;
  const { x: x1, y: y1 } = l1;
  const { x: x2, y: y2 } = l2;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  // Handle degenerate segment (l1 == l2): distance from p to that point
  if (lenSq === 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }

  const param = dot / lenSq;
  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate shape properties from contour
 * @param contour - Array of points forming the contour
 * @returns Object containing area, bounding box, and center point
 */
export function calculateShapeProperties(contour: Point[]): {
  area: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  center: Point;
} {
  if (contour.length === 0) {
    return {
      area: 0,
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      center: { x: 0, y: 0 },
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of contour) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const boundingBox = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  const center = {
    x: minX + boundingBox.width / 2,
    y: minY + boundingBox.height / 2,
  };

  // Calculate actual geometric area using Shoelace formula (also known as surveyor's formula)
  let area = 0;
  for (let i = 0; i < contour.length; i++) {
    const j = (i + 1) % contour.length;
    area += contour[i].x * contour[j].y;
    area -= contour[j].x * contour[i].y;
  }
  area = Math.abs(area) / 2;

  return { area, boundingBox, center };
}
