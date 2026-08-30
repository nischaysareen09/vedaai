// lib/pdf-processor.ts

/**
 * Convert a PDF into compressed JPEG page images.
 *
 * Runs only in the browser.
 *
 * Output:
 *   Raw base64 JPEG strings
 *   WITHOUT the data:image/jpeg;base64, prefix.
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

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

  const arrayBuffer =
    await file.arrayBuffer();

  const pdf =
    await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

  const images: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page =
      await pdf.getPage(pageNumber);

    /*
     * 1.5x is enough for OCR in most
     * scanned exam papers.
     */
    const viewport =
      page.getViewport({
        scale: 1.5,
      });

    const canvas =
      document.createElement("canvas");

    const context =
      canvas.getContext("2d");

    if (!context) {
      canvas.remove();
      continue;
    }

    canvas.width =
      Math.floor(viewport.width);

    canvas.height =
      Math.floor(viewport.height);

    /*
     * JPEG needs a background.
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

    /*
     * JPEG dramatically reduces
     * request size compared with PNG.
     */
    const dataUrl =
      canvas.toDataURL(
        "image/jpeg",
        0.70
      );

    const commaIndex =
      dataUrl.indexOf(",");

    if (commaIndex !== -1) {
      const base64 =
        dataUrl.slice(
          commaIndex + 1
        );

      if (base64) {
        images.push(base64);
      }
    }

    /*
     * Release canvas memory.
     */
    canvas.width = 1;
    canvas.height = 1;
    canvas.remove();
  }

  return images;
}

/**
 * Convert an uploaded image to JPEG base64.
 *
 * This also normalizes PNG/WebP/etc. uploads
 * into JPEG so the backend always knows
 * the correct MIME type.
 */
export async function fileToBase64(
  file: File
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error(
      "Image processing must run in the browser."
    );
  }

  const raw =
    await readFileAsDataUrl(file);

  return compressBase64Image(
    raw,
    1400,
    0.70
  );
}

/**
 * Read a file as a complete data URL.
 */
function readFileAsDataUrl(
  file: File
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result !==
          "string"
        ) {
          reject(
            new Error(
              "Could not read file."
            )
          );

          return;
        }

        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(
          reader.error ||
            new Error(
              "Could not read file."
            )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}

/**
 * Compress an image into JPEG.
 *
 * Accepts:
 *   - raw base64
 *   - data URL
 *
 * Returns:
 *   raw JPEG base64
 */
export async function compressBase64Image(
  base64: string,
  maxWidth = 1400,
  quality = 0.70
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error(
      "Image compression must run in the browser."
    );
  }

  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
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

          if (width > maxWidth) {
            const ratio =
              maxWidth / width;

            width =
              Math.round(
                width * ratio
              );

            height =
              Math.round(
                height * ratio
              );
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext(
              "2d"
            );

          if (!context) {
            canvas.remove();

            reject(
              new Error(
                "Could not create canvas."
              )
            );

            return;
          }

          context.fillStyle =
            "#ffffff";

          context.fillRect(
            0,
            0,
            width,
            height
          );

          context.imageSmoothingEnabled =
            true;

          context.imageSmoothingQuality =
            "high";

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
            canvas.width = 1;
            canvas.height = 1;
            canvas.remove();

            reject(
              new Error(
                "Could not create JPEG."
              )
            );

            return;
          }

          const compressed =
            result.slice(
              commaIndex + 1
            );

          canvas.width = 1;
          canvas.height = 1;
          canvas.remove();

          resolve(compressed);
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => {
        reject(
          new Error(
            "Could not load image."
          )
        );
      };

      if (
        base64.startsWith(
          "data:"
        )
      ) {
        image.src = base64;
      } else {
        /*
         * Uploaded images are normalized
         * to JPEG before reaching here.
         */
        image.src =
          `data:image/jpeg;base64,${base64}`;
      }
    }
  );
}

/**
 * Estimate decoded image size.
 */
export function calculateBase64Size(
  images: string[]
): number {
  const bytes =
    images.reduce(
      (total, image) => {
        if (!image) {
          return total;
        }

        const commaIndex =
          image.indexOf(",");

        const clean =
          image.startsWith("data:") &&
          commaIndex !== -1
            ? image.slice(
                commaIndex + 1
              )
            : image;

        return (
          total +
          Math.floor(
            (clean.length * 3) /
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