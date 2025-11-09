import "./style.css";
import { SelectionManager } from "./ui-utils.js";
import { EvaluationManager } from "./evaluation-manager.js";
import { ramerDouglasPeucker } from "./contour-simplification.js";
import { calculateShapeProperties } from "./geometry-utils.js";
import { classifyShape } from "./shape-classifier.js";

export interface Point {
  x: number;
  y: number;
}

export interface DetectedShape {
  type: "circle" | "triangle" | "rectangle" | "pentagon" | "star";
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: Point;
  area: number;
}

export interface DetectionResult {
  shapes: DetectedShape[];
  processingTime: number;
  imageWidth: number;
  imageHeight: number;
}

export class ShapeDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  /**
   * MAIN ALGORITHM TO IMPLEMENT
   * Method for detecting shapes in an image
   * @param imageData - ImageData from canvas
   * @returns Promise<DetectionResult> - Detection results
   *
   * TODO: Implement shape detection algorithm here
   */
  async detectShapes(imageData: ImageData): Promise<DetectionResult> {
    const startTime = performance.now();
    const height = imageData.height;
    const width = imageData.width;
    //edge detection
    //since the test images are simple black and white images
    const binaryMap = new Uint8ClampedArray(width * height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];

      const threshold = 127;

      const mapIndex = i / 4;

      if (r < threshold) {
        binaryMap[mapIndex] = 0; //black
      } else {
        binaryMap[mapIndex] = 1; //white
      }
    }

    //Contour tracing
    //Moore-Neighbor + Flood-fill
    type Pixel = { x: number; y: number };
    const allContours: Pixel[][] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (binaryMap[index] === 0) {
          const startPixel = { x: x, y: y };
          const newContour: Pixel[] = [];

          let currentPixel = { x: startPixel.x, y: startPixel.y };
          let pixelToCOmeFrom = { x: startPixel.x - 1, y: startPixel.y };

          newContour.push(startPixel);

          do {
            const neighbors = [
              { x: currentPixel.x, y: currentPixel.y - 1 }, // 0 : N
              { x: currentPixel.x + 1, y: currentPixel.y - 1 }, // 1 : NE
              { x: currentPixel.x + 1, y: currentPixel.y }, // 2 : E
              { x: currentPixel.x + 1, y: currentPixel.y + 1 }, // 3 : SE
              { x: currentPixel.x, y: currentPixel.y + 1 }, // 4 : S
              { x: currentPixel.x - 1, y: currentPixel.y + 1 }, // 5 : SW
              { x: currentPixel.x - 1, y: currentPixel.y }, // 6 : W
              { x: currentPixel.x - 1, y: currentPixel.y - 1 }, // 7 : NW
            ];
            const fromIndex = neighbors.findIndex(
              (p) => p.x === pixelToCOmeFrom.x && p.y === pixelToCOmeFrom.y
            );
            let nextPixel = null;
            let nextIndex = (fromIndex + 1) % 8;

            for (let i = 0; i < 8; i++) {
              const testPixel = neighbors[nextIndex];

              if (binaryMap[testPixel.y * width + testPixel.x] === 0) {
                nextPixel = testPixel;
                break;
              }
              nextIndex = (nextIndex + 1) % 8;
            }

            if (nextPixel) {
              pixelToCOmeFrom = currentPixel;

              currentPixel = nextPixel;
              if (
                currentPixel.x !== startPixel.x ||
                currentPixel.y !== startPixel.y
              ) {
                newContour.push(currentPixel);
              }
            } else {
              break;
            }
          } while (
            currentPixel.x !== startPixel.x ||
            currentPixel.y !== startPixel.y
          );

          allContours.push(newContour);

          //flood-fill

          const queue: Pixel[] = [startPixel];

          binaryMap[index] = 1;

          while (queue.length > 0) {
            const pixel = queue.shift()!;

            const neighbors = [
              { x: pixel.x, y: pixel.y - 1 }, //N
              { x: pixel.x + 1, y: pixel.y }, //E
              { x: pixel.x, y: pixel.y + 1 }, //S
              { x: pixel.x - 1, y: pixel.y }, //W
            ];

            for (const n of neighbors) {
              const nIndex = n.y * width + n.x;

              if (
                n.x >= 0 &&
                n.x < width &&
                n.y >= 0 &&
                n.y < height &&
                binaryMap[nIndex] === 0
              ) {
                binaryMap[nIndex] = 1;
                queue.push(n);
              }
            }
          }
        }
      }
    }

    const shapes: DetectedShape[] = [];

    for (const contour of allContours) {
      // Skip very small contours (likely noise)
      if (contour.length < 10) {
        continue;
      }

      // Use adaptive epsilon based on contour perimeter
      const perimeter = contour.length;
      const epsilon = perimeter * 0.02; // 2% of perimeter
      const simplifiedContour = ramerDouglasPeucker(contour, epsilon);

      let vertices = simplifiedContour.length;

      // Remove duplicate last point if contour is closed
      if (vertices > 1) {
        const startPoint = simplifiedContour[0];
        const endPoint = simplifiedContour[vertices - 1];
        const distance = Math.sqrt(
          Math.pow(startPoint.x - endPoint.x, 2) + 
          Math.pow(startPoint.y - endPoint.y, 2)
        );
        if (distance < 2) {
          vertices -= 1;
        }
      }

      // Calculate shape properties for better classification
      const { area, boundingBox, center } = calculateShapeProperties(contour);
      const circularity = (4 * Math.PI * area) / (perimeter * perimeter);

      // Classify shape based on vertex count and geometric properties
      const type = classifyShape(vertices, circularity);

      if (type) {
        shapes.push({
          type,
          confidence: 1.0,
          boundingBox,
          center,
          area,
        });
      }
    }

    // Placeholder implementation
    console.log("Image dimensions:", imageData.width, "x", imageData.height);

    const processingTime = performance.now() - startTime;

    return {
      shapes,
      processingTime,
      imageWidth: imageData.width,
      imageHeight: imageData.height,
    };
  }

  loadImage(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}

class ShapeDetectionApp {
  private detector: ShapeDetector;
  private imageInput: HTMLInputElement;
  private resultsDiv: HTMLDivElement;
  private testImagesDiv: HTMLDivElement;
  private evaluateButton: HTMLButtonElement;
  private evaluationResultsDiv: HTMLDivElement;
  private selectionManager: SelectionManager;
  private evaluationManager: EvaluationManager;

  constructor() {
    const canvas = document.getElementById(
      "originalCanvas"
    ) as HTMLCanvasElement;
    this.detector = new ShapeDetector(canvas);

    this.imageInput = document.getElementById("imageInput") as HTMLInputElement;
    this.resultsDiv = document.getElementById("results") as HTMLDivElement;
    this.testImagesDiv = document.getElementById(
      "testImages"
    ) as HTMLDivElement;
    this.evaluateButton = document.getElementById(
      "evaluateButton"
    ) as HTMLButtonElement;
    this.evaluationResultsDiv = document.getElementById(
      "evaluationResults"
    ) as HTMLDivElement;

    this.selectionManager = new SelectionManager();
    this.evaluationManager = new EvaluationManager(
      this.detector,
      this.evaluateButton,
      this.evaluationResultsDiv
    );

    this.setupEventListeners();
    this.loadTestImages().catch(console.error);
  }

  private setupEventListeners(): void {
    this.imageInput.addEventListener("change", async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        await this.processImage(file);
      }
    });

    this.evaluateButton.addEventListener("click", async () => {
      const selectedImages = this.selectionManager.getSelectedImages();
      await this.evaluationManager.runSelectedEvaluation(selectedImages);
    });
  }

  private async processImage(file: File): Promise<void> {
    try {
      this.resultsDiv.innerHTML = "<p>Processing...</p>";

      const imageData = await this.detector.loadImage(file);
      const results = await this.detector.detectShapes(imageData);

      this.displayResults(results);
    } catch (error) {
      this.resultsDiv.innerHTML = `<p>Error: ${error}</p>`;
    }
  }

  private displayResults(results: DetectionResult): void {
    const { shapes, processingTime } = results;

    let html = `
      <p><strong>Processing Time:</strong> ${processingTime.toFixed(2)}ms</p>
      <p><strong>Shapes Found:</strong> ${shapes.length}</p>
    `;

    if (shapes.length > 0) {
      html += "<h4>Detected Shapes:</h4><ul>";
      shapes.forEach((shape) => {
        html += `
          <li>
            <strong>${
              shape.type.charAt(0).toUpperCase() + shape.type.slice(1)
            }</strong><br>
            Confidence: ${(shape.confidence * 100).toFixed(1)}%<br>
            Center: (${shape.center.x.toFixed(1)}, ${shape.center.y.toFixed(
          1
        )})<br>
            Area: ${shape.area.toFixed(1)}px²
          </li>
        `;
      });
      html += "</ul>";
    } else {
      html +=
        "<p>No shapes detected. Please implement the detection algorithm.</p>";
    }

    this.resultsDiv.innerHTML = html;
  }

  private async loadTestImages(): Promise<void> {
    try {
      const module = await import("./test-images-data.js");
      const testImages = module.testImages;
      const imageNames = module.getAllTestImageNames();

      let html =
        '<h4>Click to upload your own image or use test images for detection. Right-click test images to select/deselect for evaluation:</h4><div class="evaluation-controls"><button id="selectAllBtn">Select All</button><button id="deselectAllBtn">Deselect All</button><span class="selection-info">0 images selected</span></div><div class="test-images-grid">';

      // Add upload functionality as first grid item
      html += `
        <div class="test-image-item upload-item" onclick="triggerFileUpload()">
          <div class="upload-icon">📁</div>
          <div class="upload-text">Upload Image</div>
          <div class="upload-subtext">Click to select file</div>
        </div>
      `;

      imageNames.forEach((imageName) => {
        const dataUrl = testImages[imageName as keyof typeof testImages];
        const displayName = imageName
          .replace(/[_-]/g, " ")
          .replace(/\.(svg|png)$/i, "");
        html += `
          <div class="test-image-item" data-image="${imageName}" 
               onclick="loadTestImage('${imageName}', '${dataUrl}')" 
               oncontextmenu="toggleImageSelection(event, '${imageName}')">
            <img src="${dataUrl}" alt="${imageName}">
            <div>${displayName}</div>
          </div>
        `;
      });

      html += "</div>";
      this.testImagesDiv.innerHTML = html;

      this.selectionManager.setupSelectionControls();

      (window as any).loadTestImage = async (name: string, dataUrl: string) => {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], name, { type: "image/svg+xml" });

          const imageData = await this.detector.loadImage(file);
          const results = await this.detector.detectShapes(imageData);
          this.displayResults(results);

          console.log(`Loaded test image: ${name}`);
        } catch (error) {
          console.error("Error loading test image:", error);
        }
      };

      (window as any).toggleImageSelection = (
        event: MouseEvent,
        imageName: string
      ) => {
        event.preventDefault();
        this.selectionManager.toggleImageSelection(imageName);
      };

      // Add upload functionality
      (window as any).triggerFileUpload = () => {
        this.imageInput.click();
      };
    } catch (error) {
      this.testImagesDiv.innerHTML = `
        <p>Test images not available. Run 'node convert-svg-to-png.js' to generate test image data.</p>
        <p>SVG files are available in the test-images/ directory.</p>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ShapeDetectionApp();
});
