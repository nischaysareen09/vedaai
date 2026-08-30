// lib/pdf-processor.ts

/**
 * Convert a PDF into compressed JPEG page images.
 *
 * IMPORTANT:
 * - Runs only in the browser.
 * - Uses JPEG instead of PNG to keep upload payloads small.
 * - 1.5x rendering is sufficient for most scanned exam papers.
 */
export async function pdfToImages(
  file: File
): Promise<string[]> {
  if (typeof window === "undefined") {
    throw new Error(
      "PDF processing must run in the browser."
    );
  }

  const pdfjsLib = await import("pdfjs-dist");

  /**
   * pdfjs-dist 4.x ships an .mjs worker.
   * Resolve it through the bundler instead of relying
   * on an external CDN.
   */
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const images: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page = await pdf.getPage(pageNumber);

    /**
     * 1.5x provides a good balance between:
     * - OCR quality
     * - processing time
     * - request size
     */
    const viewport = page.getViewport({
      scale: 1.5,
    });

    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    if (!context) {
      canvas.remove();
      continue;
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    /**
     * White background prevents transparent PDF
     * areas from becoming black when converted to JPEG.
     */
    context.fillStyle = "#ffffff";

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    /**
     * JPEG dramatically reduces the size of scanned
     * answer sheets compared with PNG.
     */
    const dataUrl = canvas.toDataURL(
      "image/jpeg",
      0.72
    );

    const commaIndex = dataUrl.indexOf(",");

    if (commaIndex !== -1) {
      const base64 = dataUrl.slice(
        commaIndex + 1
      );

      if (base64) {
        images.push(base64);
      }
    }

    /**
     * Release canvas memory after every page.
     */
    canvas.width = 1;
    canvas.height = 1;
    canvas.remove();
  }

  return images;
}

/**
 * Convert an uploaded image into base64.
 *
 * The returned value does NOT contain the
 * "data:image/...;base64," prefix.
 */
export async function fileToBase64(
  file: File
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const result = reader.result;

          if (typeof result !== "string") {
            reject(
              new Error(
                "Could not read image data."
              )
            );
            return;
          }

          const commaIndex = result.indexOf(",");

          if (commaIndex === -1) {
            reject(
              new Error(
                "Invalid image data."
              )
            );
            return;
          }

          resolve(
            result.slice(
              commaIndex + 1
            )
          );
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(
          reader.error ||
            new Error(
              "Could not read image."
            )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}

/**
 * Compress an existing base64 image.
 *
 * Useful for normal image uploads.
 *
 * Input:
 *   - Raw base64 string
 *   - OR complete data URL
 *
 * Output:
 *   - Raw JPEG base64 string
 *   - WITHOUT the data:image/jpeg;base64, prefix.
 */
export async function compressBase64Image(
  base64: string,
  maxWidth = 1600,
  quality = 0.72
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error(
      "Image compression must run in the browser."
    );
  }

  if (!base64) {
    throw new Error(
      "No image data was provided."
    );
  }

  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        let canvas: HTMLCanvasElement | null = null;

        try {
          let width =
            image.naturalWidth ||
            image.width;

          let height =
            image.naturalHeight ||
            image.height;

          if (
            width <= 0 ||
            height <= 0
          ) {
            reject(
              new Error(
                "Invalid image dimensions."
              )
            );
            return;
          }

          /**
           * Resize large images while preserving
           * their original aspect ratio.
           */
          if (width > maxWidth) {
            const ratio =
              maxWidth / width;

            width = Math.round(
              width * ratio
            );

            height = Math.round(
              height * ratio
            );
          }

          canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "Could not create canvas."
              )
            );
            return;
          }

          /**
           * JPEG does not support transparency.
           * Use a white background.
           */
          context.fillStyle =
            "#ffffff";

          context.fillRect(
            0,
            0,
            width,
            height
          );

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          const result =
            canvas.toDataURL(
              "image/jpeg",
              quality
            );

          const commaIndex =
            result.indexOf(",");

          if (commaIndex === -1) {
            reject(
              new Error(
                "Could not create compressed image."
              )
            );
            return;
          }

          const compressed =
            result.slice(
              commaIndex + 1
            );

          resolve(compressed);
        } catch (error) {
          reject(error);
        } finally {
          /**
           * Release canvas memory.
           */
          if (canvas) {
            canvas.width = 1;
            canvas.height = 1;
            canvas.remove();
          }
        }
      };

      image.onerror = () => {
        reject(
          new Error(
            "Could not load image for compression."
          )
        );
      };

      /**
       * Support both:
       *
       * 1. Raw base64
       * 2. Complete data URLs
       */
      if (
        base64.startsWith("data:")
      ) {
        image.src = base64;
      } else {
        image.src =
          `data:image/jpeg;base64,${base64}`;
      }
    }
  );
}

/**
 * Estimate the decoded size of a collection
 * of base64 images.
 *
 * Returns size in MB.
 */
export function calculateBase64Size(
  images: string[]
): number {
  const bytes = images.reduce(
    (total, image) => {
      if (!image) {
        return total;
      }

      /**
       * Remove a possible data URL prefix
       * before calculating the base64 size.
       */
      const commaIndex =
        image.indexOf(",");

      const cleanBase64 =
        image.startsWith("data:") &&
        commaIndex !== -1
          ? image.slice(
              commaIndex + 1
            )
          : image;

      /**
       * Base64 represents roughly 3 bytes
       * for every 4 characters.
       */
      return (
        total +
        Math.floor(
          (cleanBase64.length * 3) /
            4
        )
      );
    },
    0
  );

  return Number(
    (
      bytes /
      1024 /
      1024
    ).toFixed(2)
  );
}