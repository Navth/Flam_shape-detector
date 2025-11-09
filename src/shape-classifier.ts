import type { DetectedShape } from "./main.js";

/**
 * Classify shape based on vertex count and geometric properties
 * @param vertices - Number of vertices in the simplified contour
 * @param circularity - Circularity measure (4π * area / perimeter²)
 * @returns The detected shape type or null if unable to classify
 */
export function classifyShape(
  vertices: number,
  circularity: number
): DetectedShape["type"] | null {
  // Classify based on vertex count and geometric properties
  
  // Check specific vertex counts first (most reliable for polygons)
  if (vertices === 3) {
    return "triangle";
  } else if (vertices === 4) {
    return "rectangle";
  } else if (vertices === 5) {
    return "pentagon";
  } else if (vertices >= 10 && vertices <= 12) {
    // Stars typically have 10-12 vertices after simplification
    // Check circularity to distinguish from circles
    if (circularity < 0.7) {
      return "star";
    } else {
      return "circle"; // High circularity with many vertices = circle
    }
  } else if (vertices >= 6 && vertices <= 9) {
    // Could be pentagon, star, or circle - use circularity
    if (circularity > 0.75) {
      return "circle";
    } else if (vertices <= 7) {
      return "pentagon";
    } else {
      return "star";
    }
  } else if (vertices > 12) {
    // Very high vertex count indicates a circle
    return "circle";
  } else if (circularity > 0.8) {
    // Fallback: very high circularity = circle
    return "circle";
  }
  
  return null;
}
