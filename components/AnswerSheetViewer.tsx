'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AnswerRegion } from '@/lib/types';

import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  FileText,
  LocateFixed,
  Maximize2,
  ScanSearch,
  Layers3,
  MapPin,
} from 'lucide-react';

interface AnswerSheetViewerProps {
  answerImages?: string[];
  selectedRegions?: AnswerRegion[];
}

export default function AnswerSheetViewer({
  answerImages = [],
  selectedRegions = [],
}: AnswerSheetViewerProps) {
  const canvasRefs = useRef<
    (HTMLCanvasElement | null)[]
  >([]);

  const thumbnailRefs = useRef<
    (HTMLCanvasElement | null)[]
  >([]);

  const pageRefs = useRef<
    (HTMLDivElement | null)[]
  >([]);

  const viewerRef =
    useRef<HTMLDivElement | null>(null);

  const [loadedImages, setLoadedImages] = useState<
    (HTMLImageElement | null)[]
  >([]);

  const [currentPage, setCurrentPage] =
    useState(0);

  const [zoom, setZoom] = useState(100);

  const [fitMode, setFitMode] = useState(true);

  /* ==============================================================
     LOAD ANSWER SHEET IMAGES
  ============================================================== */

  useEffect(() => {
    if (!answerImages.length) {
      setLoadedImages([]);
      return;
    }

    let cancelled = false;

    const images: (
      | HTMLImageElement
      | null
    )[] = new Array(answerImages.length).fill(null);

    let completed = 0;

    answerImages.forEach((base64, index) => {
      const img = new Image();

      const finish = () => {
        completed += 1;

        if (
          !cancelled &&
          completed === answerImages.length
        ) {
          setLoadedImages([...images]);
        }
      };

      img.onload = () => {
        images[index] = img;
        finish();
      };

      img.onerror = () => {
        console.error(
          `Failed to load answer sheet page ${
            index + 1
          }`
        );

        finish();
      };

      img.src = `data:image/png;base64,${base64}`;
    });

    return () => {
      cancelled = true;

      images.forEach((img) => {
        if (img) {
          img.onload = null;
          img.onerror = null;
        }
      });
    };
  }, [answerImages]);

  /* ==============================================================
     GROUP REGIONS BY PAGE
  ============================================================== */

  const regionsByPage = useMemo(() => {
    const map = new Map<number, AnswerRegion[]>();

    selectedRegions.forEach((region) => {
      const page = Number(region.page);

      const x = Number(region.x);
      const y = Number(region.y);
      const width = Number(region.width);
      const height = Number(region.height);

      if (!Number.isFinite(page)) return;

      if (
        page < 0 ||
        page >= answerImages.length
      ) {
        return;
      }

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height)
      ) {
        return;
      }

      if (width <= 0 || height <= 0) {
        return;
      }

      const existing = map.get(page) ?? [];

      existing.push(region);

      map.set(page, existing);
    });

    return map;
  }, [selectedRegions, answerImages.length]);

  const highlightedCount =
    selectedRegions.length;

  /* ==============================================================
     DRAW MAIN DOCUMENT + HIGHLIGHTS
  ============================================================== */

  useEffect(() => {
    if (!loadedImages.length) return;

    loadedImages.forEach((img, pageIndex) => {
      const canvas =
        canvasRefs.current[pageIndex];

      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      const width =
        img.naturalWidth || img.width;

      const height =
        img.naturalHeight || img.height;

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      const pageRegions =
        regionsByPage.get(pageIndex) ?? [];

      pageRegions.forEach(
        (region, regionIndex) => {
          /*
           * Coordinates are percentages.
           *
           * Convert them to the actual image dimensions.
           */
          const x = Math.max(
            0,
            Math.min(
              width,
              (Number(region.x) / 100) *
                width
            )
          );

          const y = Math.max(
            0,
            Math.min(
              height,
              (Number(region.y) / 100) *
                height
            )
          );

          const w = Math.max(
            1,
            Math.min(
              width - x,
              (Number(region.width) / 100) *
                width
            )
          );

          const h = Math.max(
            1,
            Math.min(
              height - y,
              (Number(region.height) / 100) *
                height
            )
          );

          /* ------------------------------------------------------
             OUTER GLOW
          ------------------------------------------------------ */

          ctx.save();

          ctx.shadowColor =
            'rgba(124, 58, 237, 0.55)';

          ctx.shadowBlur = Math.max(
            12,
            width / 90
          );

          ctx.fillStyle =
            'rgba(124, 58, 237, 0.10)';

          ctx.fillRect(
            x,
            y,
            w,
            h
          );

          ctx.restore();

          /* ------------------------------------------------------
             MAIN HIGHLIGHT
          ------------------------------------------------------ */

          ctx.fillStyle =
            'rgba(124, 58, 237, 0.20)';

          ctx.fillRect(
            x,
            y,
            w,
            h
          );

          /* ------------------------------------------------------
             WHITE INNER BORDER
          ------------------------------------------------------ */

          ctx.strokeStyle =
            'rgba(255,255,255,0.95)';

          ctx.lineWidth = Math.max(
            2,
            width / 1500
          );

          ctx.strokeRect(
            x + 3,
            y + 3,
            Math.max(1, w - 6),
            Math.max(1, h - 6)
          );

          /* ------------------------------------------------------
             PURPLE OUTER BORDER
          ------------------------------------------------------ */

          ctx.strokeStyle = '#7c3aed';

          ctx.lineWidth = Math.max(
            3,
            width / 650
          );

          ctx.strokeRect(
            x,
            y,
            w,
            h
          );

          /* ------------------------------------------------------
             REGION NUMBER
          ------------------------------------------------------ */

          const labelWidth = 34;
          const labelHeight = 24;

          const labelX = Math.max(
            0,
            Math.min(
              x,
              width - labelWidth
            )
          );

          const labelY = Math.max(
            0,
            y - labelHeight
          );

          ctx.fillStyle = '#7c3aed';

          ctx.fillRect(
            labelX,
            labelY,
            labelWidth,
            labelHeight
          );

          ctx.fillStyle = '#ffffff';

          ctx.font =
            '700 12px Arial';

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillText(
            `${regionIndex + 1}`,
            labelX +
              labelWidth / 2,
            labelY +
              labelHeight / 2
          );
        }
      );
    });
  }, [loadedImages, regionsByPage]);

  /* ==============================================================
     DRAW THUMBNAILS
  ============================================================== */

  useEffect(() => {
    if (!loadedImages.length) return;

    loadedImages.forEach((img, pageIndex) => {
      const canvas =
        thumbnailRefs.current[pageIndex];

      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      const width = 112;

      const originalWidth =
        img.naturalWidth || img.width;

      const originalHeight =
        img.naturalHeight || img.height;

      const ratio =
        width / originalWidth;

      const height =
        originalHeight * ratio;

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      const pageRegions =
        regionsByPage.get(pageIndex) ?? [];

      pageRegions.forEach((region) => {
        const x =
          (Number(region.x) / 100) *
          width;

        const y =
          (Number(region.y) / 100) *
          height;

        const w =
          (Number(region.width) / 100) *
          width;

        const h =
          (Number(region.height) / 100) *
          height;

        ctx.fillStyle =
          'rgba(124,58,237,0.22)';

        ctx.fillRect(
          x,
          y,
          w,
          h
        );

        ctx.strokeStyle =
          '#7c3aed';

        ctx.lineWidth = 2;

        ctx.strokeRect(
          x,
          y,
          w,
          h
        );
      });
    });
  }, [loadedImages, regionsByPage]);

  /* ==============================================================
     SCROLL TO EXACT SELECTED REGION
  ============================================================== */

  useEffect(() => {
    if (
      !selectedRegions.length ||
      !loadedImages.length
    ) {
      return;
    }

    const firstRegion =
      selectedRegions[0];

    const page = Math.min(
      Math.max(
        0,
        Number(firstRegion.page) || 0
      ),
      loadedImages.length - 1
    );

    setCurrentPage(page);

    /*
     * Wait until React has committed the page
     * before calculating its position.
     */
    const timeout = window.setTimeout(() => {
      const viewer =
        viewerRef.current;

      const pageElement =
        pageRefs.current[page];

      if (!viewer || !pageElement) {
        return;
      }

      const viewerRect =
        viewer.getBoundingClientRect();

      const pageRect =
        pageElement.getBoundingClientRect();

      /*
       * Calculate the actual visible height of
       * the rendered page.
       */
      const pageCanvas =
        canvasRefs.current[page];

      const renderedHeight =
        pageCanvas?.getBoundingClientRect()
          .height ?? pageRect.height;

      /*
       * Convert percentage Y coordinate into
       * actual screen pixels.
       */
      const regionY =
        (Number(firstRegion.y) / 100) *
        renderedHeight;

      const regionHeight =
        (Number(firstRegion.height) / 100) *
        renderedHeight;

      /*
       * Region center inside page.
       */
      const regionCenter =
        regionY +
        regionHeight / 2;

      /*
       * Current page position relative
       * to the scroll container.
       */
      const pageOffset =
        pageRect.top -
        viewerRect.top +
        viewer.scrollTop;

      /*
       * Put exact answer region in the
       * center of the viewer.
       */
      const target =
        pageOffset +
        regionCenter -
        viewer.clientHeight / 2;

      viewer.scrollTo({
        top: Math.max(0, target),
        behavior: 'smooth',
      });
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    selectedRegions,
    loadedImages.length,
  ]);

  /* ==============================================================
     PAGE NAVIGATION
  ============================================================== */

  const goToPage = (page: number) => {
    if (
      page < 0 ||
      page >= loadedImages.length
    ) {
      return;
    }

    setCurrentPage(page);

    requestAnimationFrame(() => {
      const pageElement =
        pageRefs.current[page];

      if (!pageElement) return;

      pageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      thumbnailRefs.current[
        page
      ]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  };

  /* ==============================================================
     LOCATE FIRST ANSWER
  ============================================================== */

  const jumpToFirstAnswer = () => {
    if (!selectedRegions.length) {
      return;
    }

    const region =
      selectedRegions[0];

    const page = Math.max(
      0,
      Math.min(
        answerImages.length - 1,
        Number(region.page) || 0
      )
    );

    setCurrentPage(page);

    const timeout = window.setTimeout(() => {
      const viewer =
        viewerRef.current;

      const pageElement =
        pageRefs.current[page];

      const canvas =
        canvasRefs.current[page];

      if (
        !viewer ||
        !pageElement ||
        !canvas
      ) {
        return;
      }

      const viewerRect =
        viewer.getBoundingClientRect();

      const pageRect =
        pageElement.getBoundingClientRect();

      const canvasRect =
        canvas.getBoundingClientRect();

      const regionY =
        (Number(region.y) / 100) *
        canvasRect.height;

      const regionHeight =
        (Number(region.height) / 100) *
        canvasRect.height;

      const pageOffset =
        pageRect.top -
        viewerRect.top +
        viewer.scrollTop;

      const target =
        pageOffset +
        (canvasRect.top -
          pageRect.top) +
        regionY +
        regionHeight / 2 -
        viewer.clientHeight / 2;

      viewer.scrollTo({
        top: Math.max(0, target),
        behavior: 'smooth',
      });
    }, 100);

    window.setTimeout(() => {
      clearTimeout(timeout);
    }, 0);
  };

  /* ==============================================================
     ZOOM
  ============================================================== */

  const changeZoom = (delta: number) => {
    setFitMode(false);

    setZoom((value) =>
      Math.min(
        180,
        Math.max(60, value + delta)
      )
    );
  };

  /* ==============================================================
     EMPTY STATE
  ============================================================== */

  if (!answerImages.length) {
    return (
      <div className="h-full min-h-0 flex items-center justify-center rounded-2xl bg-white">
        <div className="text-center max-w-xs px-6">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-violet-500" />
          </div>

          <p className="text-sm font-bold text-gray-800">
            No answer sheet loaded
          </p>

          <p className="text-xs text-gray-400 mt-1 leading-5">
            Upload a handwritten answer sheet to
            inspect responses and exact answer
            locations.
          </p>
        </div>
      </div>
    );
  }

  /* ==============================================================
     MAIN VIEW
  ============================================================== */

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden rounded-2xl bg-[#f5f3ff]">
      {/* ==========================================================
          TOOLBAR
      ========================================================== */}

      <div className="shrink-0 px-4 py-3 bg-[#111126] text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <ScanSearch className="w-4 h-4 text-violet-200" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-extrabold tracking-wide">
                DOCUMENT INSPECTOR
              </p>

              <p className="text-[10px] text-white/55 truncate">
                {answerImages.length} pages ·{' '}
                {highlightedCount}{' '}
                mapped region
                {highlightedCount === 1
                  ? ''
                  : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {highlightedCount > 0 && (
              <button
                type="button"
                onClick={jumpToFirstAnswer}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/20 border border-violet-300/20 text-[10px] font-bold text-violet-100 hover:bg-violet-500/30 transition"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                Locate answer
              </button>
            )}

            {/* Zoom */}
            <div className="flex items-center rounded-xl bg-white/10 border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  changeZoom(-10)
                }
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10"
                aria-label="Zoom out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setFitMode(true);
                  setZoom(100);
                }}
                className="px-2 text-[10px] font-bold min-w-[44px]"
                title="Fit to width"
              >
                {fitMode
                  ? 'FIT'
                  : `${zoom}%`}
              </button>

              <button
                type="button"
                onClick={() =>
                  changeZoom(10)
                }
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10"
                aria-label="Zoom in"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Page navigation */}
            <div className="hidden md:flex items-center rounded-xl bg-white/10 border border-white/10 overflow-hidden">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() =>
                  goToPage(
                    currentPage - 1
                  )
                }
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 disabled:opacity-25"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 text-[10px] font-bold whitespace-nowrap">
                {currentPage + 1} /{' '}
                {answerImages.length}
              </span>

              <button
                type="button"
                disabled={
                  currentPage >=
                  answerImages.length - 1
                }
                onClick={() =>
                  goToPage(
                    currentPage + 1
                  )
                }
                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 disabled:opacity-25"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================
          STATUS STRIP
      ========================================================== */}

      <div className="shrink-0 px-4 py-2 bg-white border-b border-violet-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(124,58,237,0.10)] shrink-0" />

          <p className="text-[10px] font-semibold text-gray-600 truncate">
            {highlightedCount > 0
              ? 'Selected question mapped to the highlighted handwriting.'
              : 'Choose a question to locate its handwriting.'}
          </p>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold text-gray-400">
          <Layers3 className="w-3 h-3" />
          Exact region view
        </span>
      </div>

      {/* ==========================================================
          VIEWER BODY
      ========================================================== */}

      <div className="flex-1 min-h-0 flex">
        {/* ========================================================
            THUMBNAILS
        ======================================================== */}

        <aside className="w-[126px] shrink-0 bg-white border-r border-violet-100 overflow-y-auto p-2.5">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400">
              Pages
            </span>

            <span className="text-[9px] font-bold text-violet-500">
              {answerImages.length}
            </span>
          </div>

          <div className="space-y-2">
            {answerImages.map(
              (_, pageIndex) => {
                const active =
                  currentPage === pageIndex;

                const hasRegion =
                  regionsByPage.has(
                    pageIndex
                  );

                const regionCount =
                  regionsByPage.get(
                    pageIndex
                  )?.length ?? 0;

                return (
                  <button
                    key={pageIndex}
                    type="button"
                    onClick={() =>
                      goToPage(pageIndex)
                    }
                    className="w-full text-left group"
                  >
                    <div
                      className={`relative rounded-xl p-1.5 border transition-all ${
                        active
                          ? 'border-violet-500 bg-violet-50 shadow-[0_4px_14px_rgba(124,58,237,0.14)]'
                          : hasRegion
                          ? 'border-violet-200 bg-violet-50/50'
                          : 'border-gray-100 bg-gray-50 group-hover:border-gray-200'
                      }`}
                    >
                      <canvas
                        ref={(element) => {
                          thumbnailRefs.current[
                            pageIndex
                          ] = element;
                        }}
                        className="block w-full h-auto rounded-lg bg-white"
                      />

                      {hasRegion && (
                        <span className="absolute top-2 right-2 min-w-5 h-5 px-1 rounded-full bg-violet-600 text-white text-[8px] font-black flex items-center justify-center shadow-sm">
                          {regionCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-1 mt-1">
                      <span
                        className={`text-[9px] font-bold ${
                          active
                            ? 'text-violet-700'
                            : 'text-gray-500'
                        }`}
                      >
                        Page {pageIndex + 1}
                      </span>

                      {hasRegion && (
                        <span className="text-[8px] font-bold text-violet-500">
                          Mapped
                        </span>
                      )}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </aside>

        {/* ========================================================
            DOCUMENT STAGE
        ======================================================== */}

        <div
          ref={viewerRef}
          className="flex-1 min-w-0 overflow-auto p-5 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_38%),#f3f1fa]"
        >
          <div className="flex flex-col gap-6 min-w-full">
            {loadedImages.map(
              (img, pageIndex) => {
                if (!img) {
                  return (
                    <div
                      key={pageIndex}
                      className="mx-auto w-full max-w-3xl rounded-2xl border border-red-200 bg-white p-10 text-center text-xs text-red-500"
                    >
                      Page {pageIndex + 1}{' '}
                      could not be loaded.
                    </div>
                  );
                }

                const pageRegions =
                  regionsByPage.get(
                    pageIndex
                  ) ?? [];

                const active =
                  currentPage === pageIndex;

                const width = fitMode
                  ? 'min(100%, 920px)'
                  : `${zoom}%`;

                return (
                  <div
                    key={pageIndex}
                    ref={(element) => {
                      pageRefs.current[
                        pageIndex
                      ] = element;
                    }}
                    className={`mx-auto overflow-hidden rounded-2xl bg-white transition-all ${
                      active
                        ? 'ring-2 ring-violet-400 shadow-[0_18px_45px_rgba(91,33,182,0.16)]'
                        : 'border border-gray-200 shadow-sm'
                    }`}
                    style={{
                      width,
                      maxWidth: fitMode
                        ? '920px'
                        : 'none',
                    }}
                  >
                    {/* Page header */}
                    <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${
                            active
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {pageIndex + 1}
                        </span>

                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                          Answer page
                        </span>
                      </div>

                      {pageRegions.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-100 text-[9px] font-extrabold text-violet-700">
                          <MapPin className="w-3 h-3" />

                          {pageRegions.length}{' '}
                          mapped
                        </span>
                      )}
                    </div>

                    {/* Canvas */}
                    <div className="p-2.5 bg-[#eceaf2]">
                      <canvas
                        ref={(element) => {
                          canvasRefs.current[
                            pageIndex
                          ] = element;
                        }}
                        className="block w-full h-auto rounded-xl bg-white shadow-sm"
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* ==========================================================
          FOOTER
      ========================================================== */}

      <div className="shrink-0 px-4 py-2.5 bg-white border-t border-violet-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
            <LocateFixed className="w-3 h-3 text-violet-600" />
          </div>

          <span className="text-[9px] font-semibold text-gray-500 truncate">
            Violet regions identify the exact handwriting mapped to
            the selected question.
          </span>
        </div>

        <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-bold text-gray-400 whitespace-nowrap">
          <Maximize2 className="w-3 h-3" />
          Zoom for handwriting detail
        </span>
      </div>
    </div>
  );
}