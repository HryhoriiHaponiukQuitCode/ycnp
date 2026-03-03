"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ColumnDef {
  key: string;
  minWidth?: number;
  initialWidth?: number;
}

export function useResizableColumns(columns: ColumnDef[]) {
  const [widths, setWidths] = useState<number[]>(() =>
    columns.map((c) => c.initialWidth ?? 140)
  );

  const resizingRef = useRef<{
    index: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const onMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = {
        index,
        startX: e.clientX,
        startWidth: widths[index],
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const { index: idx, startX, startWidth } = resizingRef.current;
        const diff = ev.clientX - startX;
        const minW = columns[idx].minWidth ?? 60;
        const newWidth = Math.max(minW, startWidth + diff);
        setWidths((prev) => {
          const copy = [...prev];
          copy[idx] = newWidth;
          return copy;
        });
      };

      const onMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [widths, columns]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return { widths, onMouseDown };
}
