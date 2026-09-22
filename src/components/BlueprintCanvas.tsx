import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SeatingBlueprint, SeatingElement, Registration, Language } from '../types';
import { translations } from '../services/i18n';
import {
  Square,
  Circle,
  RectangleHorizontal,
  Type,
  Trash2,
  CheckCircle2,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  Pentagon,
  Undo2,
  RotateCcw,
  Check,
  PenTool,
  Move
} from 'lucide-react';

interface BlueprintCanvasProps {
  blueprint: SeatingBlueprint;
  isEditor?: boolean;
  onBlueprintChange?: (updated: SeatingBlueprint) => void;
  registrations?: Registration[];
  selectedElementId?: string | null;
  onSelectElement?: (element: SeatingElement) => void;
  language: Language;
  partySizeForHighlight?: number; // Party size trying to register (to highlight optimal tables)
}

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  blueprint,
  isEditor = false,
  onBlueprintChange,
  registrations = [],
  selectedElementId,
  onSelectElement,
  language,
  partySizeForHighlight
}) => {
  const t = translations[language];
  const [activeTool, setActiveTool] = useState<'select' | 'perimeter' | 'chair' | 'table_round' | 'table_rect' | 'label'>('select');
  const [editorSelectedId, setEditorSelectedId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didDragRef = useRef<boolean>(false);

  // Prevent mobile page scroll when moving elements or drawing on canvas
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const onTouchMoveNative = (e: TouchEvent) => {
      if (isEditor) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    svgEl.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    return () => {
      svgEl.removeEventListener('touchmove', onTouchMoveNative);
    };
  }, [isEditor]);

  // Default canvas dimensions
  const width = blueprint.width || 720;
  const height = blueprint.height || 480;
  const perimeterPoints = blueprint.perimeterPoints || [];

  // Calculate occupied spots per element
  const getOccupancy = (elementId: string) => {
    const regs = registrations.filter((r) => r.elementId === elementId);
    const occupied = regs.reduce((sum, r) => sum + r.partySize, 0);
    return { count: regs.length, totalPeople: occupied, attendees: regs.map(r => r.userName) };
  };

  // Overall seating metrics across all elements for live real-time canvas indicator
  const seatingStats = useMemo(() => {
    let totalCap = 0;
    let totalOcc = 0;
    let availableChairs = 0;
    let totalChairs = 0;
    let availableTables = 0;
    let totalTables = 0;

    blueprint.elements.forEach((elem) => {
      if (elem.type === 'label') return;
      const regs = registrations.filter((r) => r.elementId === elem.id);
      const occ = regs.reduce((sum, r) => sum + r.partySize, 0);
      const remaining = Math.max(0, elem.capacity - occ);
      totalCap += elem.capacity;
      totalOcc += occ;

      if (elem.type === 'chair') {
        totalChairs += 1;
        if (remaining > 0) availableChairs += 1;
      } else if (elem.type === 'table_round' || elem.type === 'table_rect') {
        totalTables += 1;
        if (remaining > 0) availableTables += 1;
      }
    });

    const totalAvail = Math.max(0, totalCap - totalOcc);
    return {
      totalCapacity: totalCap,
      totalOccupied: totalOcc,
      totalAvailable: totalAvail,
      availableChairs,
      totalChairs,
      availableTables,
      totalTables
    };
  }, [blueprint.elements, registrations]);

  // SVG coordinate transformation
  const getCoordinates = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    const svgEl = svgRef.current;
    if (!svgEl) return { x: 0, y: 0 };
    const svgRect = svgEl.getBoundingClientRect();
    const clientX =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      'touches' in e && e.touches.length > 0
        ? e.touches[0].clientY
        : (e as React.MouseEvent).clientY;
    const rawX = ((clientX - svgRect.left) / svgRect.width) * width;
    const rawY = ((clientY - svgRect.top) / svgRect.height) * height;
    return {
      x: Math.round(Math.max(2, Math.min(width - 2, rawX))),
      y: Math.round(Math.max(2, Math.min(height - 2, rawY)))
    };
  };

  // Helper: find closest edge on closed polygon to insert a new vertex
  const getClosestEdgeIndex = (
    point: { x: number; y: number },
    pts: { x: number; y: number }[]
  ): number => {
    if (pts.length < 2) return 0;
    let minDistance = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;

      let dist: number;
      if (l2 === 0) {
        dist = Math.hypot(point.x - a.x, point.y - a.y);
      } else {
        let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = a.x + t * dx;
        const projY = a.y + t * dy;
        dist = Math.hypot(point.x - projX, point.y - projY);
      }

      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }

    return bestIndex;
  };

  // Editor Canvas Click Actions
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isEditor || !onBlueprintChange) return;

    // If we just finished dragging an item or vertex, do not trigger a click action
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    if (activeTool === 'select') {
      // clicking empty area clears selection
      setEditorSelectedId(null);
      return;
    }

    const { x: clickX, y: clickY } = getCoordinates(e);

    // Perimeter drawing logic
    if (activeTool === 'perimeter') {
      // If user has less than 3 points, build the initial chain
      if (perimeterPoints.length < 3) {
        const updated = [...perimeterPoints, { x: clickX, y: clickY }];
        onBlueprintChange({ ...blueprint, perimeterPoints: updated });
        return;
      }

      // If clicking near the first point and already have >= 3 points, close polygon
      const first = perimeterPoints[0];
      const distToStart = Math.hypot(clickX - first.x, clickY - first.y);
      if (distToStart < 22) {
        setActiveTool('select');
        setHoverPoint(null);
        return;
      }

      // Insert new point into the closest perimeter edge!
      // This fixes the bug where points were only appended between the first and last point.
      const bestEdgeIndex = getClosestEdgeIndex({ x: clickX, y: clickY }, perimeterPoints);
      const updated = [
        ...perimeterPoints.slice(0, bestEdgeIndex + 1),
        { x: clickX, y: clickY },
        ...perimeterPoints.slice(bestEdgeIndex + 1)
      ];
      onBlueprintChange({ ...blueprint, perimeterPoints: updated });
      return;
    }

    const newId = `elem-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    let newElem: SeatingElement;

    if (activeTool === 'chair') {
      const elemW = 44;
      const elemH = 44;
      newElem = {
        id: newId,
        type: 'chair',
        x: Math.round(Math.max(2, Math.min(width - elemW - 2, clickX - elemW / 2))),
        y: Math.round(Math.max(2, Math.min(height - elemH - 2, clickY - elemH / 2))),
        width: elemW,
        height: elemH,
        label: `C-${blueprint.elements.filter((el) => el.type === 'chair').length + 1}`,
        capacity: 1
      };
    } else if (activeTool === 'table_round') {
      const elemW = 80;
      const elemH = 80;
      newElem = {
        id: newId,
        type: 'table_round',
        x: Math.round(Math.max(2, Math.min(width - elemW - 2, clickX - elemW / 2))),
        y: Math.round(Math.max(2, Math.min(height - elemH - 2, clickY - elemH / 2))),
        width: elemW,
        height: elemH,
        label: `${t.defaultTablePrefix} ${blueprint.elements.filter((el) => el.type.startsWith('table')).length + 1}`,
        capacity: 4
      };
    } else if (activeTool === 'table_rect') {
      const elemW = 120;
      const elemH = 70;
      newElem = {
        id: newId,
        type: 'table_rect',
        x: Math.round(Math.max(2, Math.min(width - elemW - 2, clickX - elemW / 2))),
        y: Math.round(Math.max(2, Math.min(height - elemH - 2, clickY - elemH / 2))),
        width: elemW,
        height: elemH,
        label: `${t.defaultTablePrefix} ${blueprint.elements.filter((el) => el.type.startsWith('table')).length + 1}`,
        capacity: 6
      };
    } else {
      const elemW = 140;
      const elemH = 30;
      newElem = {
        id: newId,
        type: 'label',
        x: Math.round(Math.max(2, Math.min(width - elemW - 2, clickX - elemW / 2))),
        y: Math.round(Math.max(2, Math.min(height - elemH - 2, clickY - elemH / 2))),
        width: elemW,
        height: elemH,
        label: t.defaultLabelName,
        capacity: 0
      };
    }

    const updated = {
      ...blueprint,
      elements: [...blueprint.elements, newElem]
    };
    onBlueprintChange(updated);
    setEditorSelectedId(newId);
    setActiveTool('select');
  };

  // Pointer Move (Mouse + Touch)
  const handlePointerMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>
  ) => {
    if (!isEditor || !onBlueprintChange) return;

    if ('cancelable' in e && e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e);

    // 1. Dragging an element (chair, table, label)
    if (draggingElementId) {
      didDragRef.current = true;
      const targetElem = blueprint.elements.find((el) => el.id === draggingElementId);
      if (targetElem) {
        const newX = Math.round(
          Math.max(2, Math.min(width - targetElem.width - 2, x - dragOffsetRef.current.x))
        );
        const newY = Math.round(
          Math.max(2, Math.min(height - targetElem.height - 2, y - dragOffsetRef.current.y))
        );
        const updated = blueprint.elements.map((el) =>
          el.id === draggingElementId ? { ...el, x: newX, y: newY } : el
        );
        onBlueprintChange({ ...blueprint, elements: updated });
      }
      return;
    }

    // 2. Dragging a perimeter vertex
    if (draggingVertexIndex !== null && blueprint.perimeterPoints) {
      didDragRef.current = true;
      const updated = [...blueprint.perimeterPoints];
      updated[draggingVertexIndex] = { x, y };
      onBlueprintChange({ ...blueprint, perimeterPoints: updated });
      return;
    }

    // 3. Hovering in perimeter tool
    if (activeTool === 'perimeter') {
      setHoverPoint({ x, y });
    }
  };

  const handlePointerUp = () => {
    setDraggingVertexIndex(null);
    setDraggingElementId(null);
  };

  const handlePointerLeave = () => {
    setDraggingVertexIndex(null);
    setDraggingElementId(null);
    setHoverPoint(null);
  };

  const handleDeleteVertex = (index: number) => {
    if (!onBlueprintChange || !blueprint.perimeterPoints || blueprint.perimeterPoints.length <= 3) {
      return;
    }
    const updated = blueprint.perimeterPoints.filter((_, i) => i !== index);
    onBlueprintChange({ ...blueprint, perimeterPoints: updated });
  };

  // Element drag start on mouse / touch down
  const handleElementPointerDown = (
    e: React.MouseEvent | React.TouchEvent,
    elem: SeatingElement
  ) => {
    if (!isEditor) return;
    e.stopPropagation();

    if ('cancelable' in e && e.cancelable) {
      e.preventDefault();
    }

    setEditorSelectedId(elem.id);

    if (activeTool === 'select') {
      const coords = getCoordinates(e as unknown as React.MouseEvent<SVGSVGElement>);
      dragOffsetRef.current = {
        x: coords.x - elem.x,
        y: coords.y - elem.y
      };
      didDragRef.current = false;
      setDraggingElementId(elem.id);
    }
  };

  const handleUndoPerimeterPoint = () => {
    if (!onBlueprintChange || !blueprint.perimeterPoints || blueprint.perimeterPoints.length === 0) return;
    const updated = blueprint.perimeterPoints.slice(0, -1);
    onBlueprintChange({
      ...blueprint,
      perimeterPoints: updated.length > 0 ? updated : undefined
    });
  };

  const handleClearPerimeter = () => {
    if (!onBlueprintChange) return;
    onBlueprintChange({ ...blueprint, perimeterPoints: undefined });
    setHoverPoint(null);
  };

  const applyPerimeterPreset = (preset: 'rect' | 'l_shape' | 'nave' | 'full_canvas') => {
    if (!onBlueprintChange) return;
    let points: { x: number; y: number }[] = [];
    if (preset === 'full_canvas') {
      points = [
        { x: 6, y: 6 },
        { x: width - 6, y: 6 },
        { x: width - 6, y: height - 6 },
        { x: 6, y: height - 6 }
      ];
    } else if (preset === 'rect') {
      points = [
        { x: 30, y: 30 },
        { x: width - 30, y: 30 },
        { x: width - 30, y: height - 30 },
        { x: 30, y: height - 30 }
      ];
    } else if (preset === 'l_shape') {
      points = [
        { x: 30, y: 30 },
        { x: Math.round(width * 0.62), y: 30 },
        { x: Math.round(width * 0.62), y: Math.round(height * 0.52) },
        { x: width - 30, y: Math.round(height * 0.52) },
        { x: width - 30, y: height - 30 },
        { x: 30, y: height - 30 }
      ];
    } else if (preset === 'nave') {
      points = [
        { x: 40, y: 100 },
        { x: Math.round(width * 0.32), y: 100 },
        { x: Math.round(width * 0.36), y: 25 },
        { x: Math.round(width * 0.64), y: 25 },
        { x: Math.round(width * 0.68), y: 100 },
        { x: width - 40, y: 100 },
        { x: width - 40, y: height - 30 },
        { x: 40, y: height - 30 }
      ];
    }
    onBlueprintChange({ ...blueprint, perimeterPoints: points });
  };

  const handleCanvasDimensions = (newWidth: number, newHeight: number) => {
    if (!onBlueprintChange) return;
    onBlueprintChange({
      ...blueprint,
      width: newWidth,
      height: newHeight
    });
  };

  const handleUpdateSelectedElement = (updates: Partial<SeatingElement>) => {
    if (!editorSelectedId || !onBlueprintChange) return;
    const updatedElements = blueprint.elements.map((el) =>
      el.id === editorSelectedId ? { ...el, ...updates } : el
    );
    onBlueprintChange({ ...blueprint, elements: updatedElements });
  };

  const handleDeleteSelectedElement = () => {
    if (!editorSelectedId || !onBlueprintChange) return;
    const updatedElements = blueprint.elements.filter((el) => el.id !== editorSelectedId);
    onBlueprintChange({ ...blueprint, elements: updatedElements });
    setEditorSelectedId(null);
  };

  const handleClearAll = () => {
    if (!onBlueprintChange) return;
    onBlueprintChange({ ...blueprint, elements: [] });
    setEditorSelectedId(null);
  };

  const selectedEditorElement = blueprint.elements.find((el) => el.id === editorSelectedId);

  const getResizeBounds = (type: SeatingElement['type']) => {
    switch (type) {
      case 'chair':
        return { min: 24, max: 90, defaultVal: 44 };
      case 'table_round':
        return { min: 40, max: 180, defaultVal: 80 };
      case 'table_rect':
        return { min: 60, max: 240, defaultVal: 120 };
      case 'label':
      default:
        return { min: 70, max: 300, defaultVal: 140 };
    }
  };

  const handleResizeSelectedElement = (newWidth: number) => {
    if (!selectedEditorElement || !onBlueprintChange) return;

    let newHeight = selectedEditorElement.height;
    if (selectedEditorElement.type === 'chair' || selectedEditorElement.type === 'table_round') {
      newHeight = newWidth;
    } else if (selectedEditorElement.type === 'table_rect') {
      const currentRatio = selectedEditorElement.height / selectedEditorElement.width;
      const ratio = currentRatio > 0 ? currentRatio : (70 / 120);
      newHeight = Math.max(25, Math.round(newWidth * ratio));
    } else if (selectedEditorElement.type === 'label') {
      newHeight = selectedEditorElement.height;
    }

    // Keep centered around current center point
    const deltaW = newWidth - selectedEditorElement.width;
    const deltaH = newHeight - selectedEditorElement.height;

    const newX = Math.round(
      Math.max(5, Math.min(width - newWidth - 5, selectedEditorElement.x - deltaW / 2))
    );
    const newY = Math.round(
      Math.max(5, Math.min(height - newHeight - 5, selectedEditorElement.y - deltaH / 2))
    );

    const updatedElements = blueprint.elements.map((el) =>
      el.id === selectedEditorElement.id
        ? {
            ...el,
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY
          }
        : el
    );
    onBlueprintChange({ ...blueprint, elements: updatedElements });
  };

  // Table-packing suitability calculation
  // "our target is to get as many tables filled without empty seats so people for example lets say a table fits 4 and 1 registers for 2 then 2 are free in that table the if next 2 people wants to register then the systems highlights only the table s that might fill out by adding them. they cant register for an empty table of 8 for example."
  const getSuitabilityStatus = (element: SeatingElement) => {
    if (element.type === 'label') return { suitable: false, status: 'label' };

    const { totalPeople } = getOccupancy(element.id);
    const remaining = element.capacity - totalPeople;

    if (remaining <= 0) {
      return { suitable: false, status: 'full', remaining: 0 };
    }

    if (!partySizeForHighlight || partySizeForHighlight <= 0) {
      return { suitable: true, status: 'available', remaining };
    }

    if (element.type === 'chair') {
      return {
        suitable: remaining >= partySizeForHighlight,
        status: remaining >= partySizeForHighlight ? 'optimal' : 'unavailable',
        remaining
      };
    }

    // Table packing optimization:
    // Case 1: Table has remaining seats exactly equal to party size -> PERFECT OPTIMAL FILL!
    if (remaining === partySizeForHighlight) {
      return { suitable: true, status: 'optimal_exact', remaining };
    }

    // Case 2: Table is partially filled (some people already seated) and can accommodate party size
    if (totalPeople > 0 && remaining >= partySizeForHighlight) {
      return { suitable: true, status: 'optimal_partial', remaining };
    }

    // Case 3: Empty table that closely matches party size (e.g., party of 4 on table of 4)
    if (totalPeople === 0 && element.capacity <= partySizeForHighlight + 1 && remaining >= partySizeForHighlight) {
      return { suitable: true, status: 'good_fit', remaining };
    }

    // Case 4: Oversized empty table (e.g., party of 2 picking an empty table of 8 when smaller options exist)
    if (totalPeople === 0 && element.capacity >= partySizeForHighlight + 3) {
      return { suitable: false, status: 'oversized_empty', remaining };
    }

    return {
      suitable: remaining >= partySizeForHighlight,
      status: remaining >= partySizeForHighlight ? 'available' : 'full',
      remaining
    };
  };

  return (
    <div id="seating-blueprint-wrapper" className="w-full flex flex-col gap-3">
      {/* Editor Toolbar (Only for Admin creation/editing) */}
      {isEditor && (
        <div
          id="blueprint-editor-toolbar"
          className="bg-stone-100 p-2 sm:p-2.5 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveTool(activeTool === 'perimeter' ? 'select' : 'perimeter');
                setEditorSelectedId(null);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTool === 'perimeter'
                  ? 'bg-amber-700 text-white shadow-xs ring-2 ring-amber-600/30'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Pentagon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.canvasToolbarPerimeter}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('chair')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTool === 'chair'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Square className="w-3.5 h-3.5 shrink-0" />
              <span>{t.canvasToolbarChair}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('table_round')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTool === 'table_round'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Circle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.canvasToolbarRoundTable}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('table_rect')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTool === 'table_rect'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <RectangleHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>{t.canvasToolbarRectTable}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('label')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTool === 'label'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span>{t.canvasToolbarText}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 ms-auto">
            {/* Canvas Dimensions Selector */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200">
              <span className="text-[11px] font-semibold text-stone-600 shrink-0">
                {t.canvasSize}
              </span>
              <select
                aria-label={t.canvasSize}
                value={`${width}x${height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  handleCanvasDimensions(w, h);
                }}
                className="text-xs font-bold text-stone-800 bg-transparent border-0 focus:ring-0 cursor-pointer py-0.5"
              >
                <option value="720x480">{t.canvasSizeStandard}</option>
                <option value="880x480">{t.canvasSizeWide}</option>
                <option value="1000x580">{t.canvasSizeLarge}</option>
                <option value="720x640">{t.canvasSizeTall}</option>
              </select>
            </div>

            {/* Maximize / Expand view toggle */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                isMaximized
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
              title={isMaximized ? t.canvasMinimize : t.canvasMaximize}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isMaximized ? t.canvasMinimize : t.canvasMaximize}</span>
            </button>

            {/* Clear Canvas button */}
            <button
              id="blueprint-clear-all-btn"
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t.canvasToolbarClear}</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Full-Canvas Clarification Notice */}
      {isEditor && (
        <div className="text-[11px] text-stone-600 bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>{t.canvasBoundaryNote}</span>
        </div>
      )}

      {/* Perimeter Drawing Active Toolbar */}
      {isEditor && activeTool === 'perimeter' && (
        <div
          id="perimeter-editor-bar"
          className="bg-amber-50/90 border border-amber-300 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs animate-in fade-in duration-150"
        >
          <div className="flex flex-wrap items-center gap-2 text-stone-800 min-w-0">
            <PenTool className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-medium text-xs leading-snug">{t.canvasPerimeterDrawInstruction}</span>
            <span className="bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[11px] shrink-0 whitespace-nowrap">
              {t.canvasPerimeterPointsCount} {perimeterPoints.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {perimeterPoints.length >= 3 && (
              <button
                type="button"
                onClick={() => setActiveTool('select')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{t.canvasPerimeterCloseBtn}</span>
              </button>
            )}

            {perimeterPoints.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleUndoPerimeterPoint}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-200 border border-stone-300 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Undo2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.canvasPerimeterUndoPoint}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearPerimeter}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-200 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.canvasPerimeterClear}</span>
                </button>
              </>
            )}

            {/* Quick Perimeter Presets */}
            <div className="flex flex-wrap items-center gap-1 border-s border-amber-300 ps-2">
              <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap">
                {language === 'fr' ? 'Modèles :' : language === 'en' ? 'Presets:' : 'قوالب:'}
              </span>
              <button
                type="button"
                onClick={() => applyPerimeterPreset('full_canvas')}
                className="px-2 py-1 text-[11px] rounded bg-amber-700 text-white hover:bg-amber-800 font-bold whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                title="Fill 100% of canvas"
              >
                {t.canvasPerimeterFullCanvas}
              </button>
              <button
                type="button"
                onClick={() => applyPerimeterPreset('rect')}
                className="px-2 py-1 text-[11px] rounded bg-white hover:bg-amber-100 border border-amber-200 text-stone-700 cursor-pointer font-medium whitespace-nowrap shrink-0"
              >
                {t.canvasPerimeterPresetRect}
              </button>
              <button
                type="button"
                onClick={() => applyPerimeterPreset('l_shape')}
                className="px-2 py-1 text-[11px] rounded bg-white hover:bg-amber-100 border border-amber-200 text-stone-700 cursor-pointer font-medium whitespace-nowrap shrink-0"
              >
                {t.canvasPerimeterPresetLShape}
              </button>
              <button
                type="button"
                onClick={() => applyPerimeterPreset('nave')}
                className="px-2 py-1 text-[11px] rounded bg-white hover:bg-amber-100 border border-amber-200 text-stone-700 cursor-pointer font-medium whitespace-nowrap shrink-0"
              >
                {t.canvasPerimeterPresetNave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Active Element Configuration Bar */}
      {isEditor && selectedEditorElement && (
        <div
          id="editor-element-properties"
          className="bg-amber-50/95 border border-amber-200 p-3 rounded-xl flex flex-col gap-2.5 text-xs animate-in fade-in duration-150 shadow-xs"
        >
          {/* Top Row: Tag input, number count, and delete button */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-700">{t.canvasLabelInput}:</span>
              <input
                type="text"
                value={selectedEditorElement.label}
                onChange={(e) => handleUpdateSelectedElement({ label: e.target.value })}
                className="px-2.5 py-1 bg-white rounded-lg border border-amber-300 font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {selectedEditorElement.type !== 'label' && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-700">{t.canvasCapacityInput}:</span>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={selectedEditorElement.capacity}
                  onChange={(e) => handleUpdateSelectedElement({ capacity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-16 px-2.5 py-1 bg-white rounded-lg border border-amber-300 font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleDeleteSelectedElement}
              className="ms-auto text-red-600 hover:text-red-800 font-medium flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'fr' ? 'Supprimer' : language === 'en' ? 'Delete' : 'حذف العنصر'}</span>
            </button>
          </div>

          {/* Bottom Row: Slider that allows to resize the chair or table below the tag input and number count */}
          {(() => {
            const bounds = getResizeBounds(selectedEditorElement.type);
            return (
              <div
                id="editor-element-resize-controls"
                className="pt-2 border-t border-amber-200/80 flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3"
              >
                <div className="flex items-center gap-1.5 text-stone-700 font-semibold shrink-0">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>{t.canvasResizeSlider}</span>
                </div>

                <div className="flex-1 flex items-center gap-2 min-w-[170px]">
                  <span className="text-[10px] text-stone-400 font-medium shrink-0">
                    {bounds.min}px
                  </span>
                  <input
                    id="element-size-slider"
                    type="range"
                    min={bounds.min}
                    max={bounds.max}
                    step="2"
                    value={selectedEditorElement.width}
                    onChange={(e) => handleResizeSelectedElement(parseInt(e.target.value) || bounds.defaultVal)}
                    className="w-full h-2 bg-amber-200/90 rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-stone-400 font-medium shrink-0">
                    {bounds.max}px
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-amber-300 font-mono text-[11px] font-bold text-amber-900 shadow-2xs">
                    {selectedEditorElement.width} × {selectedEditorElement.height} px
                  </span>
                  <button
                    type="button"
                    onClick={() => handleResizeSelectedElement(bounds.defaultVal)}
                    title={t.canvasResetSize}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-100 border border-amber-300 text-[11px] font-medium text-stone-600 cursor-pointer transition-colors"
                  >
                    {t.canvasResetSize}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Real-time Live Seat Availability Bar */}
      {!isEditor && (
        <div
          id="realtime-seat-availability-bar"
          className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Live Real-time Pulse Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 font-bold text-[11px] shadow-xs shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>
                {language === 'ar' ? 'تحديث المقاعد مباشر وفوري' : language === 'fr' ? 'Direct temps réel' : 'Live Real-Time'}
              </span>
            </span>

            {/* Total Available Seats Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-extrabold text-xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>
                {seatingStats.totalAvailable} {language === 'ar' ? 'مقعد شاغر متاح' : language === 'fr' ? 'places disponibles' : 'available seats'}
              </span>
            </span>

            {/* Total Reserved Seats Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold text-xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span>
                {seatingStats.totalOccupied} {language === 'ar' ? 'مقعد محجوز' : language === 'fr' ? 'réservées' : 'reserved'}
              </span>
            </span>
          </div>

          {/* Quick Breakdown of Chairs & Tables */}
          <div className="flex flex-wrap items-center gap-2 text-stone-300 text-[11px] font-medium self-end sm:self-auto">
            {seatingStats.totalChairs > 0 && (
              <span className="bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/80">
                🪑 {seatingStats.availableChairs}/{seatingStats.totalChairs} {language === 'ar' ? 'كراسي شاغرة' : language === 'fr' ? 'chaises libres' : 'chairs free'}
              </span>
            )}
            {seatingStats.totalTables > 0 && (
              <span className="bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/80">
                🍽️ {seatingStats.availableTables}/{seatingStats.totalTables} {language === 'ar' ? 'طاولات بها مقاعد' : language === 'fr' ? 'tables ouvertes' : 'tables open'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Seating Guide / Legend for Users */}
      {!isEditor && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-stone-50/80 p-2.5 rounded-xl border border-stone-200">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-700 shrink-0">
              <span className="w-3.5 h-3.5 rounded-sm bg-emerald-100 border-2 border-emerald-500 shrink-0" />
              <span>{t.statusAvailable}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-700 shrink-0">
              <span className="w-3.5 h-3.5 rounded-sm bg-rose-100 border-2 border-rose-400 shrink-0" />
              <span>{t.statusReserved}</span>
            </span>
            {partySizeForHighlight && partySizeForHighlight > 0 && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-900 shrink-0">
                <span className="w-3.5 h-3.5 rounded-sm bg-amber-400 border-2 border-amber-600 animate-pulse shrink-0" />
                <span>
                  {t.optimalFitBadge} ({partySizeForHighlight} {language === 'fr' ? 'pers.' : language === 'en' ? 'guests' : 'أفراد'})
                </span>
              </span>
            )}
          </div>
          <span className="text-stone-400 flex items-center gap-1 text-[11px] shrink-0">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{t.selectASeatOrTable}</span>
          </span>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div
        id="blueprint-canvas-box"
        className={`relative w-full rounded-2xl overflow-hidden border border-stone-300 bg-slate-950 shadow-inner touch-none select-none transition-all duration-150 ${
          isMaximized
            ? 'fixed inset-3 sm:inset-6 z-50 p-4 bg-slate-950/98 shadow-2xl border-2 border-amber-500 flex flex-col justify-center items-center backdrop-blur-md'
            : ''
        }`}
        style={{
          aspectRatio: isMaximized ? undefined : `${width} / ${height}`,
          touchAction: 'none'
        }}
      >
        {isMaximized && (
          <div className="absolute top-4 end-4 z-50 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMaximized(false)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer ring-2 ring-white/30"
            >
              <Minimize2 className="w-4 h-4" />
              <span>{t.canvasMinimize}</span>
            </button>
          </div>
        )}
        <svg
          ref={svgRef}
          id="church-blueprint-svg"
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full h-full block select-none touch-none ${
            isEditor
              ? activeTool === 'perimeter'
                ? 'cursor-crosshair'
                : 'cursor-default'
              : 'cursor-default'
          }`}
          style={{
            touchAction: 'none',
            maxHeight: isMaximized ? '85vh' : undefined
          }}
          onClick={handleCanvasClick}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerLeave}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {/* Grid pattern background for architectural blueprint feel */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Hall Perimeter Room Border - Custom drawn by admin, not given by default */}
          {blueprint.perimeterPoints && blueprint.perimeterPoints.length >= 3 ? (
            <polygon
              points={blueprint.perimeterPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="rgba(30, 41, 59, 0.45)"
              stroke={activeTool === 'perimeter' ? '#f59e0b' : '#cbd5e1'}
              strokeWidth={activeTool === 'perimeter' ? '3.5' : '3'}
              strokeDasharray={activeTool === 'perimeter' ? '6 3' : '4 2'}
              className="transition-colors duration-200"
            />
          ) : activeTool === 'perimeter' && blueprint.perimeterPoints && blueprint.perimeterPoints.length > 0 ? (
            <polyline
              points={blueprint.perimeterPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeDasharray="6 3"
            />
          ) : null}

          {/* Guide rubberband line to cursor while drawing perimeter */}
          {activeTool === 'perimeter' &&
            hoverPoint &&
            draggingVertexIndex === null &&
            blueprint.perimeterPoints &&
            blueprint.perimeterPoints.length > 0 &&
            blueprint.perimeterPoints.length < 3 && (
              <line
                x1={blueprint.perimeterPoints[blueprint.perimeterPoints.length - 1].x}
                y1={blueprint.perimeterPoints[blueprint.perimeterPoints.length - 1].y}
                x2={hoverPoint.x}
                y2={hoverPoint.y}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity="0.8"
              />
            )}

          {/* Midpoint '+' buttons on each wall segment to easily insert a corner point on that exact wall */}
          {activeTool === 'perimeter' &&
            blueprint.perimeterPoints &&
            blueprint.perimeterPoints.length >= 3 &&
            blueprint.perimeterPoints.map((ptA, i) => {
              const pts = blueprint.perimeterPoints!;
              const ptB = pts[(i + 1) % pts.length];
              const midX = Math.round((ptA.x + ptB.x) / 2);
              const midY = Math.round((ptA.y + ptB.y) / 2);
              return (
                <g
                  key={`edge-plus-${i}`}
                  className="cursor-pointer select-none group"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = [
                      ...pts.slice(0, i + 1),
                      { x: midX, y: midY },
                      ...pts.slice(i + 1)
                    ];
                    if (onBlueprintChange) {
                      onBlueprintChange({ ...blueprint, perimeterPoints: updated });
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.cancelable) e.preventDefault();
                    const updated = [
                      ...pts.slice(0, i + 1),
                      { x: midX, y: midY },
                      ...pts.slice(i + 1)
                    ];
                    if (onBlueprintChange) {
                      onBlueprintChange({ ...blueprint, perimeterPoints: updated });
                    }
                  }}
                >
                  <circle
                    cx={midX}
                    cy={midY}
                    r="10"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform hover:scale-125"
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    +
                  </text>
                </g>
              );
            })}

          {/* Draggable Vertex Handles while activeTool === 'perimeter' */}
          {activeTool === 'perimeter' &&
            blueprint.perimeterPoints &&
            blueprint.perimeterPoints.map((pt, idx) => {
              const pts = blueprint.perimeterPoints!;
              const isFirst = idx === 0;
              const canClose = isFirst && pts.length >= 3;
              return (
                <g key={`vertex-${idx}`} className="select-none">
                  {canClose && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="rgba(16, 185, 129, 0.25)"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      className="animate-pulse"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={canClose ? 10 : 8}
                    fill={canClose ? '#10b981' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="cursor-move hover:scale-125 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingVertexIndex(idx);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.cancelable) e.preventDefault();
                      setDraggingVertexIndex(idx);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVertex(idx);
                    }}
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 12}
                    textAnchor="middle"
                    fill="#fef08a"
                    fontSize="11"
                    fontWeight="bold"
                    className="pointer-events-none drop-shadow-sm select-none"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}

          {/* Subtle Empty Perimeter Notice for Admin if not yet drawn */}
          {isEditor &&
            activeTool !== 'perimeter' &&
            (!blueprint.perimeterPoints || blueprint.perimeterPoints.length < 3) && (
              <g className="pointer-events-none select-none opacity-40">
                <rect
                  x="20"
                  y="20"
                  width={width - 40}
                  height={height - 40}
                  rx="16"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.5"
                  strokeDasharray="8 6"
                />
                <text
                  x={width / 2}
                  y={height / 2}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="12"
                  fontWeight="500"
                >
                  {t.canvasPerimeterEmptyNotice}
                </text>
              </g>
            )}

          {/* Render Elements: Chairs, Tables, Labels */}
          {blueprint.elements.map((element) => {
            const isSelected = isEditor
              ? editorSelectedId === element.id
              : selectedElementId === element.id;

            const isCurrentlyDragging = isEditor && draggingElementId === element.id;

            const { totalPeople } = getOccupancy(element.id);
            const remaining = element.capacity - totalPeople;
            const suitability = getSuitabilityStatus(element);

            const isFullyBooked = element.capacity > 0 && remaining <= 0;
            const isOptimal = suitability.status === 'optimal_exact' || suitability.status === 'optimal_partial';
            const isOversized = suitability.status === 'oversized_empty';

            // Styling logic based on state
            let fillColor = '#0f172a';
            let strokeColor = '#94a3b8';
            let strokeWidth = 2;

            if (element.type === 'label') {
              fillColor = 'transparent';
              strokeColor = 'none';
            } else if (isCurrentlyDragging || isSelected) {
              fillColor = '#f59e0b';
              strokeColor = '#ffffff';
              strokeWidth = 3.5;
            } else if (isFullyBooked) {
              fillColor = '#881337';
              strokeColor = '#e11d48';
            } else if (isOptimal) {
              fillColor = '#065f46';
              strokeColor = '#34d399';
              strokeWidth = 3;
            } else if (isOversized) {
              fillColor = '#1e293b';
              strokeColor = '#475569';
            } else {
              fillColor = '#1e293b';
              strokeColor = '#10b981';
            }

            const handleClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }
              if (isEditor) {
                setEditorSelectedId(element.id);
              } else if (onSelectElement) {
                if (element.type === 'label') return;
                onSelectElement(element);
              }
            };

            return (
              <g
                key={element.id}
                id={`elem-${element.id}`}
                onClick={handleClick}
                onMouseEnter={() => setHoveredElementId(element.id)}
                onMouseLeave={() => setHoveredElementId(null)}
                onMouseDown={(e) => handleElementPointerDown(e, element)}
                onTouchStart={(e) => handleElementPointerDown(e, element)}
                className={`transition-opacity duration-150 ${
                  isEditor ? 'cursor-move' : element.type !== 'label' ? 'cursor-pointer hover:opacity-90' : ''
                } ${isCurrentlyDragging ? 'opacity-80' : 'opacity-100'}`}
              >
                {/* 1. Square Chair */}
                {element.type === 'chair' && (() => {
                  const isCompact = element.width < 40 || element.height < 40;
                  const chairRemaining = Math.max(0, element.capacity - totalPeople);
                  const isChairFull = element.capacity > 0 && chairRemaining <= 0;
                  return (
                    <>
                      <rect
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        height={element.height}
                        rx={Math.max(4, Math.min(12, Math.round(element.width * 0.18)))}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                      {/* Chair top rail line */}
                      <line
                        x1={element.x + 5}
                        y1={element.y + (isCompact ? 5 : 7)}
                        x2={element.x + element.width - 5}
                        y2={element.y + (isCompact ? 5 : 7)}
                        stroke={isChairFull ? '#f87171' : '#34d399'}
                        strokeWidth={isCompact ? 1.5 : 2}
                        strokeLinecap="round"
                        opacity="0.85"
                      />
                      {/* Chair Label */}
                      <text
                        x={element.x + element.width / 2}
                        y={element.y + element.height / 2 - (isCompact ? 1 : 2)}
                        fill="#ffffff"
                        fontSize={isCompact ? "9" : "11"}
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {element.label}
                      </text>
                      {/* Real-time Available Seats text */}
                      <text
                        x={element.x + element.width / 2}
                        y={element.y + element.height - (isCompact ? 3.5 : 5)}
                        fill={isChairFull ? '#fca5a5' : '#a7f3d0'}
                        fontSize={isCompact ? "7" : "8.5"}
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {isChairFull
                          ? (language === 'ar' ? '0 متاح' : language === 'fr' ? '0 disp.' : '0 left')
                          : (element.capacity === 1
                              ? (language === 'ar' ? '1 متاح' : language === 'fr' ? '1 disp.' : '1 left')
                              : `${chairRemaining}/${element.capacity}`)}
                      </text>
                      {/* Real-time status indicator dot */}
                      <circle
                        cx={element.x + element.width - 5}
                        cy={element.y + 5}
                        r={isCompact ? 2.5 : 3.5}
                        fill={isChairFull ? '#ef4444' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    </>
                  );
                })()}

                {/* 2. Round Table (Circle) */}
                {element.type === 'table_round' && (() => {
                  const cx = element.x + element.width / 2;
                  const cy = element.y + element.height / 2;
                  const r = element.width / 2;
                  const isCompact = element.width < 65;

                  return (
                    <>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                      <text
                        x={cx}
                        y={cy - (isCompact ? 3 : 7)}
                        fill="#ffffff"
                        fontSize={isCompact ? "9" : element.width > 120 ? "13" : "11"}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {element.label}
                      </text>

                      {/* Prominent Available Seats Badge */}
                      {(() => {
                        const badgeW = isCompact ? 50 : (language === 'ar' ? 82 : language === 'fr' ? 80 : 72);
                        const badgeH = isCompact ? 13 : 17;
                        return (
                          <g>
                            <rect
                              x={cx - badgeW / 2}
                              y={cy + (isCompact ? 1 : 2)}
                              width={badgeW}
                              height={badgeH}
                              rx={badgeH / 2}
                              fill={isFullyBooked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}
                              stroke={isFullyBooked ? '#ef4444' : '#10b981'}
                              strokeWidth="1"
                            />
                            <text
                              x={cx}
                              y={cy + (isCompact ? 10 : 14)}
                              fill={isFullyBooked ? '#fca5a5' : '#a7f3d0'}
                              fontSize={isCompact ? "7.5" : "9.5"}
                              fontWeight="800"
                              textAnchor="middle"
                            >
                              {isFullyBooked
                                ? (language === 'fr' ? '0/' + element.capacity + ' Complet' : language === 'en' ? '0/' + element.capacity + ' Full' : '0/' + element.capacity + ' ممتلئة')
                                : `${remaining}/${element.capacity} ${language === 'fr' ? 'dispo' : language === 'en' ? 'avail' : 'شاغر'}`}
                            </text>
                          </g>
                        );
                      })()}
                    </>
                  );
                })()}

                {/* 3. Rect Table (Rectangle) */}
                {element.type === 'table_rect' && (() => {
                  const isCompact = element.width < 90 || element.height < 50;
                  const cx = element.x + element.width / 2;
                  const cy = element.y + element.height / 2;

                  return (
                    <>
                      <rect
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        height={element.height}
                        rx={Math.max(6, Math.min(16, Math.round(element.height * 0.18)))}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                      />
                      <text
                        x={cx}
                        y={cy - (isCompact ? 4 : 8)}
                        fill="#ffffff"
                        fontSize={isCompact ? "10" : element.width > 160 ? "14" : "12"}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {element.label}
                      </text>

                      {/* Prominent Available Seats Badge */}
                      {(() => {
                        const badgeW = isCompact ? (language === 'ar' ? 62 : 68) : (language === 'ar' ? 80 : language === 'fr' ? 88 : 80);
                        const badgeH = isCompact ? 14 : 18;
                        return (
                          <g>
                            <rect
                              x={cx - badgeW / 2}
                              y={cy + (isCompact ? 1 : 2)}
                              width={badgeW}
                              height={badgeH}
                              rx={badgeH / 2}
                              fill={isFullyBooked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}
                              stroke={isFullyBooked ? '#ef4444' : '#10b981'}
                              strokeWidth="1"
                            />
                            <text
                              x={cx}
                              y={cy + (isCompact ? 11 : 14)}
                              fill={isFullyBooked ? '#fca5a5' : '#a7f3d0'}
                              fontSize={isCompact ? "8" : "9.5"}
                              fontWeight="800"
                              textAnchor="middle"
                            >
                              {isFullyBooked
                                ? (language === 'fr' ? '0/' + element.capacity + ' Complet' : language === 'en' ? '0/' + element.capacity + ' Full' : '0/' + element.capacity + ' ممتلئة')
                                : `${remaining}/${element.capacity} ${language === 'fr' ? 'places' : language === 'en' ? 'seats' : 'شاغر'}`}
                            </text>
                          </g>
                        );
                      })()}
                    </>
                  );
                })()}

                {/* 4. Text Label / Area Name */}
                {element.type === 'label' && (
                  <g>
                    <rect
                      x={element.x}
                      y={element.y}
                      width={element.width}
                      height={element.height}
                      rx="6"
                      fill="rgba(15, 23, 42, 0.75)"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    <text
                      x={element.x + element.width / 2}
                      y={element.y + element.height / 2 + 4}
                      fill="#f1f5f9"
                      fontSize="12"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {element.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Real-time HUD info for hovered / selected element - HTML Overlay */}
        {(() => {
          const activeElemId = hoveredElementId || selectedElementId;
          if (!activeElemId) return null;
          const elem = blueprint.elements.find((e) => e.id === activeElemId);
          if (!elem || elem.type === 'label') return null;

          const { totalPeople, attendees } = getOccupancy(elem.id);
          const rem = Math.max(0, elem.capacity - totalPeople);
          const isFull = elem.capacity > 0 && rem <= 0;
          const isRTL = language === 'ar';

          const typeLabel = elem.type === 'chair'
            ? (language === 'ar' ? 'كرسي' : language === 'fr' ? 'Chaise' : 'Chair')
            : (language === 'ar' ? 'طاولة' : language === 'fr' ? 'Table' : 'Table');

          const statusText = isFull
            ? (language === 'ar'
                ? `ممتلئة بالكامل (${elem.capacity}/${elem.capacity})`
                : language === 'fr'
                ? `Complet (${elem.capacity}/${elem.capacity})`
                : `Fully Booked (${elem.capacity}/${elem.capacity})`)
            : (language === 'ar'
                ? `${rem} من ${elem.capacity} مقاعد شاغرة`
                : language === 'fr'
                ? `${rem}/${elem.capacity} places libres`
                : `${rem}/${elem.capacity} seats available`);

          const bookedSubtext = !isFull && totalPeople > 0
            ? (language === 'ar'
                ? `(${totalPeople} محجوز)`
                : language === 'fr'
                ? `(${totalPeople} rés.)`
                : `(${totalPeople} booked)`)
            : null;

          const guestsText = attendees.length > 0
            ? attendees.slice(0, 2).join(language === 'ar' ? '، ' : ', ') + (attendees.length > 2 ? '...' : '')
            : null;

          // Percentage-based positioning directly aligned to SVG viewBox
          const elemCenterX = elem.x + elem.width / 2;
          const pctX = Math.max(12, Math.min(88, (elemCenterX / width) * 100));
          const isNearTop = elem.y < 80;
          const pctY = isNearTop
            ? ((elem.y + elem.height) / height) * 100
            : (elem.y / height) * 100;

          return (
            <div
              className="absolute pointer-events-none z-30 transition-all duration-100"
              style={{
                left: `${pctX}%`,
                top: `${pctY}%`,
                transform: `translateX(-50%) ${isNearTop ? 'translateY(10px)' : 'translateY(-10px) translateY(-100%)'}`,
              }}
            >
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`w-max max-w-[280px] sm:max-w-[320px] px-3 py-2 rounded-xl shadow-2xl backdrop-blur-md border text-start select-none ${
                  isFull
                    ? 'bg-slate-950/95 border-rose-500/80 shadow-rose-950/50'
                    : 'bg-slate-950/95 border-emerald-500/80 shadow-emerald-950/50'
                }`}
              >
                {/* Header row: Label & Type */}
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-white border-b border-white/10 pb-1 mb-1">
                  <span className="truncate">{elem.label}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-stone-300 shrink-0">
                    {typeLabel}
                  </span>
                </div>

                {/* Status indicator row */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap">
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                      isFull ? 'bg-rose-500 ring-2 ring-rose-400/40' : 'bg-emerald-400 ring-2 ring-emerald-400/40'
                    }`}
                  />
                  <span className={isFull ? 'text-rose-300' : 'text-emerald-300'}>
                    {statusText}
                  </span>
                  {bookedSubtext && (
                    <span className="text-stone-400 text-[10px] font-normal">
                      {bookedSubtext}
                    </span>
                  )}
                </div>

                {/* Attendees row if any */}
                {guestsText && (
                  <div className="mt-1 pt-1 border-t border-white/10 text-[10px] text-stone-300 flex items-center gap-1 truncate">
                    <span className="text-stone-400 shrink-0">
                      {language === 'ar' ? 'الضيوف:' : language === 'fr' ? 'Inscrits:' : 'Guests:'}
                    </span>
                    <span className="truncate text-stone-200 font-medium">
                      {guestsText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
