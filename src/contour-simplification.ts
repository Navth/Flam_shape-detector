import type { Point } from "./main.js";
import { perpendicularDistance } from "./geometry-utils.js";

/**
 * Ramer-Douglas-Peucker algorithm for contour simplification
 * Reduces the number of points in a curve that is approximated by a series of points
 * @param points - Array of points forming the contour
 * @param epsilon - Maximum distance threshold for simplification
 * @returns Simplified array of points
 */
export function ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;

  let maxDistance = 0;
  let farthestIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      farthestIndex = i;
    }
  }

  if (maxDistance > epsilon) {
    const leftResults = ramerDouglasPeucker(
      points.slice(0, farthestIndex + 1),
      epsilon
    );

    const rightResults = ramerDouglasPeucker(
      points.slice(farthestIndex),
      epsilon
    );

    return leftResults.slice(0, -1).concat(rightResults);
  } else {
    return [start, end];
  }
}
