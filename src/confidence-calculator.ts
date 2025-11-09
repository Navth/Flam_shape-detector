import type { DetectedShape } from "./main.js";

/**
 * Calculate confidence score for a detected shape based on multiple geometric properties
 * @param shapeType - The type of shape detected
 * @param vertices - Number of vertices in the simplified contour
 * @param circularity - Circularity measure (4π * area / perimeter²)
 * @param contourLength - Original contour length before simplification
 * @param boundingBox - Bounding box of the shape
 * @returns Confidence score between 0 and 1
 */
export function calculateConfidence(
  shapeType: DetectedShape["type"],
  vertices: number,
  circularity: number,
  contourLength: number,
  boundingBox: { x: number; y: number; width: number; height: number }
): number {
  let confidence = 1.0;

  // Calculate aspect ratio for rectangles and regular shapes
  const aspectRatio = boundingBox.width / boundingBox.height;
  const normalizedAspectRatio = Math.min(aspectRatio, 1 / aspectRatio); // 0 to 1 range

  switch (shapeType) {
    case "circle":
      confidence = calculateCircleConfidence(
        circularity,
        normalizedAspectRatio,
        contourLength
      );
      break;

    case "triangle":
      confidence = calculateTriangleConfidence(
        vertices,
        circularity,
        contourLength
      );
      break;

    case "rectangle":
      confidence = calculateRectangleConfidence(
        vertices,
        normalizedAspectRatio,
        circularity,
        contourLength
      );
      break;

    case "pentagon":
      confidence = calculatePentagonConfidence(
        vertices,
        circularity,
        contourLength
      );
      break;

    case "star":
      confidence = calculateStarConfidence(
        vertices,
        circularity,
        contourLength
      );
      break;
  }

  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate confidence for circle detection
 */
function calculateCircleConfidence(
  circularity: number,
  normalizedAspectRatio: number,
  contourLength: number
): number {
  let confidence = 0.5;

  // High circularity is very strong indicator
  if (circularity > 0.85) {
    confidence = 0.95;
  } else if (circularity > 0.75) {
    confidence = 0.85;
  } else if (circularity > 0.65) {
    confidence = 0.7;
  } else {
    confidence = 0.5;
  }

  // Circles should have aspect ratio close to 1 (square bounding box)
  const aspectRatioPenalty = (1 - normalizedAspectRatio) * 0.2;
  confidence -= aspectRatioPenalty;

  // Larger contours are more reliable
  if (contourLength < 50) {
    confidence *= 0.8; // Small shapes might be noise
  }

  return confidence;
}

/**
 * Calculate confidence for triangle detection
 */
function calculateTriangleConfidence(
  vertices: number,
  circularity: number,
  contourLength: number
): number {
  let confidence = 0.9;

  // Exactly 3 vertices is ideal
  if (vertices !== 3) {
    confidence = 0.5; // Shouldn't happen, but just in case
  }

  // Triangles should have lower circularity than circles
  if (circularity < 0.5) {
    confidence = Math.min(confidence, 0.95);
  } else if (circularity > 0.7) {
    confidence *= 0.7; // Too circular for a triangle
  }

  // Size check
  if (contourLength < 30) {
    confidence *= 0.8;
  }

  return confidence;
}

/**
 * Calculate confidence for rectangle detection
 */
function calculateRectangleConfidence(
  vertices: number,
  _normalizedAspectRatio: number,
  circularity: number,
  contourLength: number
): number {
  let confidence = 0.9;

  // Exactly 4 vertices is ideal
  if (vertices !== 4) {
    confidence = 0.5;
  }

  // Rectangles should have lower circularity
  if (circularity < 0.7) {
    confidence = Math.min(confidence, 0.95);
  } else if (circularity > 0.8) {
    confidence *= 0.6; // Too circular for a rectangle
  }

  // Any aspect ratio is fine for rectangles (can be square or elongated)
  // Could use normalizedAspectRatio for future refinements

  // Size check
  if (contourLength < 40) {
    confidence *= 0.8;
  }

  return confidence;
}

/**
 * Calculate confidence for pentagon detection
 */
function calculatePentagonConfidence(
  vertices: number,
  circularity: number,
  contourLength: number
): number {
  let confidence = 0.85;

  // Exactly 5 vertices is ideal
  if (vertices !== 5) {
    confidence = 0.5;
  }

  // Pentagons have moderate circularity (between triangles and circles)
  if (circularity >= 0.6 && circularity <= 0.8) {
    confidence = Math.min(confidence, 0.9);
  } else if (circularity > 0.8) {
    confidence *= 0.7; // Too circular
  } else if (circularity < 0.4) {
    confidence *= 0.7; // Too angular
  }

  // Size check
  if (contourLength < 50) {
    confidence *= 0.8;
  }

  return confidence;
}

/**
 * Calculate confidence for star detection
 */
function calculateStarConfidence(
  vertices: number,
  circularity: number,
  contourLength: number
): number {
  let confidence = 0.8;

  // Stars typically have 10-12 vertices after simplification
  if (vertices >= 10 && vertices <= 12) {
    confidence = 0.85;
  } else if (vertices >= 8 && vertices <= 14) {
    confidence = 0.75;
  } else {
    confidence = 0.6;
  }

  // Stars should have low circularity due to their pointed shape
  if (circularity < 0.5) {
    confidence = Math.min(confidence + 0.1, 0.95);
  } else if (circularity > 0.65) {
    confidence *= 0.6; // Too circular for a star
  }

  // Size check
  if (contourLength < 60) {
    confidence *= 0.8; // Stars need more detail
  }

  return confidence;
}
