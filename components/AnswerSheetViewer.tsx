'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AnswerRegion,
} from '@/lib/types';

import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  FileText,
  Maximize2,
} from 'lucide-react';

interface AnswerSheetViewerProps {
  answerImages?: string[];
  selectedRegions: AnswerRegion[];
}

/**
 * Convert raw base64 or an existing data URL
 * into a browser-loadable image URL.
 */
function toImageSrc(value: string): string {
  if (value.startsWith('data:image/')) {
    return value;
  }

  /**
   * New pdf-processor output is JPEG.
   */
  return `data:image/jpeg;base64,${value}`;
}

const PULSE_DURATION_MS = 900;

/**
 * Draws the static highlight fill + border for a region. This is the
 * "settled" appearance, used both for the final pulse frame and for
 * re-draws that aren't animating (e.g. window resize doesn't apply here,
 * but future callers might redraw without wanting to re-trigger a pulse).
 */
function drawStaticRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number
) {
  ctx.fillStyle = 'rgba(124, 58, 237, 0.12)';
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = 'rgba(124, 58, 237, 0.20)';
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = 'rgba(124, 58, 237, 0.95)';
  ctx.lineWidth = Math.max(3, canvasWidth / 600);
  ctx.strokeRect(x, y, width, height);
}

/**
 * Draws an expanding, fading ring around a region — a brief "found it"
 * pulse so a newly-selected answer draws the eye instead of just
 * silently appearing.
 */
function drawPulseRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  progress: number // 0 -> 1
) {
  const expand = progress * (canvasWidth / 45); // how far the ring grows outward
  const alpha = 1 - progress; // fades out as it expands

  ctx.strokeStyle = `rgba(124, 58, 237, ${alpha * 0.85})`;
  ctx.lineWidth = Math.max(2, canvasWidth / 500);
  ctx.strokeRect(
    x - expand,
    y - expand,
    width + expand * 2,
    height + expand * 2
  );
}

export default function AnswerSheetViewer({
  answerImages = [],
  selectedRegions,
}: AnswerSheetViewerProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const thumbnailRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const pulseFrameRef = useRef<number | null>(null);

  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);

  /**
   * ===========================================================
   * LOAD IMAGES
   * ===========================================================
   */
  useEffect(() => {
    if (!answerImages || answerImages.length === 0) {
      setLoadedImages([]);
      return;
    }

    let cancelled = false;
    const images: HTMLImageElement[] = new Array(answerImages.length);
    let loadedCount = 0;
    let failedCount = 0;

    const finish = () => {
      if (cancelled) return;
      if (loadedCount + failedCount !== answerImages.length) return;

      const successful = images.filter(Boolean);
      setLoadedImages(successful);
    };

    answerImages.forEach((base64, index) => {
      const image = new Image();

      image.onload = () => {
        loadedCount++;
        finish();
      };

      image.onerror = () => {
        failedCount++;
        console.error(`[AnswerSheetViewer] Failed to load page ${index + 1}`);
        finish();
      };

      image.src = toImageSrc(base64);
      images[index] = image;
    });

    return () => {
      cancelled = true;
      images.forEach((image) => {
        if (!image) return;
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [answerImages]);

  /**
   * ===========================================================
   * DRAW MAIN PAGE + ANIMATED HIGHLIGHT PULSE
   * ===========================================================
   *
   * Redraws every page's base image + static highlight immediately, then
   * runs a short rAF loop that layers an expanding/fading pulse ring on
   * top of the *currently selected* regions only, so a new selection
   * visibly draws the eye instead of the highlight just appearing.
   */
  useEffect(() => {
    if (loadedImages.length === 0) return;

    if (pulseFrameRef.current !== null) {
      cancelAnimationFrame(pulseFrameRef.current);
      pulseFrameRef.current = null;
    }

    const drawBaseAndStaticHighlights = () => {
      loadedImages.forEach((image, pageIndex) => {
        const canvas = canvasRefs.current[pageIndex];
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const pageRegions = selectedRegions.filter((r) => r.page === pageIndex);
        pageRegions.forEach((region) => {
          const x = (region.x / 100) * canvas.width;
          const y = (region.y / 100) * canvas.height;
          const width = (region.width / 100) * canvas.width;
          const height = (region.height / 100) * canvas.height;

          drawStaticRegion(context, x, y, width, height, canvas.width);
        });
      });
    };

    drawBaseAndStaticHighlights();

    if (selectedRegions.length === 0) return;

    const start = performance.now();

    const animatePulse = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / PULSE_DURATION_MS);

      // Re-draw base + static highlight, then layer the pulse ring on top
      // for just the pages that have a selected region — cheap enough at
      // typical scan resolutions, and only runs for ~900ms per selection.
      selectedRegions.forEach((region) => {
        const canvas = canvasRefs.current[region.page];
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const x = (region.x / 100) * canvas.width;
        const y = (region.y / 100) * canvas.height;
        const width = (region.width / 100) * canvas.width;
        const height = (region.height / 100) * canvas.height;

        drawPulseRing(context, x, y, width, height, canvas.width, progress);
      });

      if (progress < 1) {
        pulseFrameRef.current = requestAnimationFrame(animatePulse);
      } else {
        // Final frame: leave the clean static highlight, no ring residue.
        drawBaseAndStaticHighlights();
        pulseFrameRef.current = null;
      }
    };

    pulseFrameRef.current = requestAnimationFrame(animatePulse);

    return () => {
      if (pulseFrameRef.current !== null) {
        cancelAnimationFrame(pulseFrameRef.current);
        pulseFrameRef.current = null;
      }
    };
  }, [loadedImages, selectedRegions]);

  /**
   * ===========================================================
   * DRAW THUMBNAILS
   * ===========================================================
   */
  useEffect(() => {
    if (loadedImages.length === 0) return;

    loadedImages.forEach((image, index) => {
      const canvas = thumbnailRefs.current[index];
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const thumbnailWidth = 130;
      const ratio = thumbnailWidth / image.width;
      const thumbnailHeight = image.height * ratio;

      canvas.width = thumbnailWidth;
      canvas.height = thumbnailHeight;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, thumbnailWidth, thumbnailHeight);

      const hasSelectedRegion = selectedRegions.some((region) => region.page === index);

      if (hasSelectedRegion) {
        context.fillStyle = 'rgba(124, 58, 237, 0.15)';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    });
  }, [loadedImages, selectedRegions]);

  /**
   * ===========================================================
   * JUMP TO SELECTED ANSWER PAGE
   * ===========================================================
   */
  useEffect(() => {
    if (selectedRegions.length === 0) return;
    if (loadedImages.length === 0) return;

    const firstRegion = selectedRegions[0];
    const safePage = Math.max(
      0,
      Math.min(Number(firstRegion.page) || 0, loadedImages.length - 1)
    );

    setCurrentPage(safePage);

    window.setTimeout(() => {
      const thumbnail = thumbnailRefs.current[safePage];
      thumbnail?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }, [selectedRegions, loadedImages.length]);

  /**
   * ===========================================================
   * SCROLL MAIN PAGE
   * ===========================================================
   */
  useEffect(() => {
    if (!pageContainerRef.current || loadedImages.length === 0) return;

    const pageElement = pageContainerRef.current.querySelector(
      `[data-page="${currentPage}"]`
    );

    pageElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage, loadedImages.length]);

  /**
   * ===========================================================
   * NO IMAGES
   * ===========================================================
   */
  if (answerImages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
        <div className="text-center animate-fade-in">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-xs font-bold text-gray-600">No answer-sheet pages</p>
          <p className="mt-1 text-[10px] text-gray-400">Upload an answer sheet to inspect it.</p>
        </div>
      </div>
    );
  }

  /**
   * ===========================================================
   * IMAGES FAILED TO LOAD
   * ===========================================================
   */
  if (answerImages.length > 0 && loadedImages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-red-100 bg-red-50">
        <div className="max-w-xs text-center animate-fade-in">
          <FileText className="mx-auto mb-3 h-8 w-8 text-red-300" />
          <p className="text-xs font-bold text-red-800">Could not render answer sheet</p>
          <p className="mt-1 text-[10px] leading-4 text-red-600">
            The stored answer pages could not be decoded by the browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 animate-fade-in">
      {/* THUMBNAILS */}
      <aside className="hidden w-[150px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-2 md:block">
        <div className="space-y-2">
          {loadedImages.map((_image, index) => {
            const isActive = currentPage === index;
            const hasRegion = selectedRegions.some((region) => region.page === index);

            return (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentPage(index)}
                className={`relative w-full overflow-hidden rounded-xl border p-1 transition-all duration-200 ${
                  isActive
                    ? 'border-violet-500 ring-2 ring-violet-200 scale-[1.02]'
                    : 'border-gray-200 hover:border-violet-300'
                }`}
              >
                <canvas
                  ref={(element) => {
                    thumbnailRefs.current[index] = element;
                  }}
                  className="block w-full rounded-lg"
                />

                <span className="absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[8px] font-bold text-white">
                  {index + 1}
                </span>

                {hasRegion && (
                  <span className="absolute right-2 top-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-[8px] font-bold text-white animate-breathe">
                    •
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* MAIN VIEW */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* CONTROLS */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 0}
              onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:border-gray-300 active:scale-90 disabled:opacity-30 disabled:active:scale-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="min-w-[80px] text-center text-[10px] font-bold text-gray-600 tabular-nums">
              Page {currentPage + 1} / {loadedImages.length}
            </span>

            <button
              type="button"
              disabled={currentPage >= loadedImages.length - 1}
              onClick={() =>
                setCurrentPage((page) => Math.min(loadedImages.length - 1, page + 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:border-gray-300 active:scale-90 disabled:opacity-30 disabled:active:scale-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(50, value - 10))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:border-gray-300 active:scale-90"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            <span className="w-12 text-center text-[10px] font-bold text-gray-500 tabular-nums">
              {zoom}%
            </span>

            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(200, value + 10))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:border-gray-300 active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setZoom(100)}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:border-gray-300 active:scale-90"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* PAGES */}
        <div ref={pageContainerRef} className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
          <div className="mx-auto flex w-fit min-w-[500px] flex-col gap-6">
            {loadedImages.map((_image, index) => (
              <div
                key={index}
                data-page={index}
                className="relative overflow-hidden rounded-lg bg-white shadow-lg transition-[width] duration-200"
                style={{
                  width: `${zoom}%`,
                  minWidth: zoom < 100 ? '600px' : undefined,
                }}
              >
                <canvas
                  ref={(element) => {
                    canvasRefs.current[index] = element;
                  }}
                  className="block h-auto w-full"
                />

                <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/65 px-2 py-1 text-[9px] font-bold text-white">
                  Page {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}