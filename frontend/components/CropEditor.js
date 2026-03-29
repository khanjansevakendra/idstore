import { useRef, useState } from "react";

export default function CropEditor({
  imageUrl,
  crop,
  label,
  onChange,
  page,
  pageOptions,
  onPageChange,
  adjustments,
  showLivePreview = true
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [interaction, setInteraction] = useState(null);
  const [zoom, setZoom] = useState(1);
  const maxZoom = 4;

  function pointFromEvent(event) {
    const bounds = stageRef.current?.getBoundingClientRect();

    if (!bounds) {
      return null;
    }

    const x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);

    return { x, y };
  }

  function handlePointerDown(event) {
    event.preventDefault();
    const point = pointFromEvent(event);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setInteraction({
      mode: "create",
      start: point,
      initialCrop: crop
    });
    onChange({
      ...crop,
      x: point.x,
      y: point.y,
      width: 0.001,
      height: 0.001
    });
  }

  function handlePointerMove(event) {
    if (!interaction) {
      return;
    }

    event.preventDefault();
    const point = pointFromEvent(event);

    if (!point) {
      return;
    }

    if (interaction.mode === "create") {
      const x = Math.min(interaction.start.x, point.x);
      const y = Math.min(interaction.start.y, point.y);
      const width = Math.abs(point.x - interaction.start.x);
      const height = Math.abs(point.y - interaction.start.y);

      onChange({
        ...crop,
        x,
        y,
        width,
        height
      });
      return;
    }

    if (interaction.mode === "move") {
      const dx = point.x - interaction.start.x;
      const dy = point.y - interaction.start.y;
      const nextX = clamp(interaction.initialCrop.x + dx, 0, 1 - interaction.initialCrop.width);
      const nextY = clamp(interaction.initialCrop.y + dy, 0, 1 - interaction.initialCrop.height);

      onChange({
        ...crop,
        x: nextX,
        y: nextY
      });
      return;
    }

    if (interaction.mode === "resize") {
      const nextCrop = resizeCrop(interaction.handle, interaction.initialCrop, point);
      onChange({
        ...crop,
        ...nextCrop
      });
    }
  }

  function handlePointerUp() {
    setInteraction(null);
  }

  function handleInputChange(key, value) {
    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return;
    }

    onChange({
      ...crop,
      [key]: Math.min(Math.max(numeric, 0), 1)
    });
  }

  function changeZoom(nextZoom) {
    setZoom(Math.min(maxZoom, Math.max(1, nextZoom)));
  }

  function startMove(event) {
    event.preventDefault();
    event.stopPropagation();
    const point = pointFromEvent(event);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setInteraction({
      mode: "move",
      start: point,
      initialCrop: crop
    });
  }

  function startResize(handle, event) {
    event.preventDefault();
    event.stopPropagation();
    const point = pointFromEvent(event);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setInteraction({
      mode: "resize",
      handle,
      start: point,
      initialCrop: crop
    });
  }

  const previewFilter = [
    `brightness(${adjustments?.brightness || 1})`,
    `contrast(${adjustments?.contrast || 1})`,
    `saturate(${adjustments?.saturation || 1})`
  ].join(" ");

  const previewWidth = `${100 / Math.max(crop?.width || 1, 0.001)}%`;
  const previewHeight = `${100 / Math.max(crop?.height || 1, 0.001)}%`;
  const previewLeft = `${-((crop?.x || 0) / Math.max(crop?.width || 1, 0.001)) * 100}%`;
  const previewTop = `${-((crop?.y || 0) / Math.max(crop?.height || 1, 0.001)) * 100}%`;
  const previewAspectRatio = `${Math.max(crop?.width || 1, 0.001)} / ${Math.max(crop?.height || 1, 0.001)}`;
  const previewTransformOrigin = `${((crop?.x || 0) + (crop?.width || 0) / 2) * 100}% ${((crop?.y || 0) + (crop?.height || 0) / 2) * 100}%`;

  return (
    <section className="crop-editor">
      <div className="template-preview-header">
        <div>
          <span className="service-tag">{label}</span>
          <h3>Drag to select crop area</h3>
        </div>
      </div>

      <div className="crop-toolbar">
        <button
          type="button"
          className="button zoom-button"
          onClick={() => changeZoom(zoom - 0.25)}
        >
          -
        </button>
        <label className="zoom-label">
          Zoom {Math.round(zoom * 100)}%
          <input
            type="range"
            min="1"
            max={maxZoom}
            step="0.25"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          className="button zoom-button"
          onClick={() => changeZoom(zoom + 0.25)}
        >
          +
        </button>
        <button
          type="button"
          className="button zoom-button"
          onClick={() => changeZoom(1)}
        >
          Reset
        </button>
      </div>

      {pageOptions?.length ? (
        <label>
          Page
          <select
            value={page}
            onChange={(event) => onPageChange?.(Number(event.target.value))}
          >
            {pageOptions.map((option, index) => (
              <option key={option.fileName} value={index}>
                Page {index + 1}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div
        ref={containerRef}
        className="crop-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
        className="crop-stage"
        ref={stageRef}
        style={{ width: `${zoom * 100}%` }}
      >
          <img
            src={imageUrl}
            alt={label}
            className="crop-image"
          />
          <div
            className="crop-rect"
            style={{
              left: `${(crop?.x || 0) * 100}%`,
              top: `${(crop?.y || 0) * 100}%`,
              width: `${(crop?.width || 0) * 100}%`,
              height: `${(crop?.height || 0) * 100}%`
            }}
            onPointerDown={startMove}
          >
            <div className="crop-rect-label">Move</div>
            <button
              type="button"
              className="crop-handle top-left"
              onPointerDown={(event) => startResize("top-left", event)}
              aria-label="Resize top left"
            />
            <button
              type="button"
              className="crop-handle top-right"
              onPointerDown={(event) => startResize("top-right", event)}
              aria-label="Resize top right"
            />
            <button
              type="button"
              className="crop-handle bottom-left"
              onPointerDown={(event) => startResize("bottom-left", event)}
              aria-label="Resize bottom left"
            />
            <button
              type="button"
              className="crop-handle bottom-right"
              onPointerDown={(event) => startResize("bottom-right", event)}
              aria-label="Resize bottom right"
            />
          </div>
        </div>
      </div>

      <div className="crop-input-grid">
        <label>
          X
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={crop?.x ?? 0}
            onChange={(event) => handleInputChange("x", event.target.value)}
          />
        </label>
        <label>
          Y
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={crop?.y ?? 0}
            onChange={(event) => handleInputChange("y", event.target.value)}
          />
        </label>
        <label>
          Width
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={crop?.width ?? 0}
            onChange={(event) => handleInputChange("width", event.target.value)}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={crop?.height ?? 0}
            onChange={(event) => handleInputChange("height", event.target.value)}
          />
        </label>
      </div>

      {showLivePreview ? (
        <div className="crop-live-preview">
          <div>
            <span className="service-tag">Live Preview</span>
            <h4>Current crop with current settings</h4>
          </div>
          <div className="crop-live-frame" style={{ aspectRatio: previewAspectRatio }}>
            <img
              src={imageUrl}
              alt={`${label} live preview`}
              className="crop-live-image"
              style={{
                width: previewWidth,
                height: previewHeight,
                left: previewLeft,
                top: previewTop,
                filter: previewFilter,
                transform: `scale(${adjustments?.contentZoom || 1})`,
                transformOrigin: previewTransformOrigin
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resizeCrop(handle, initialCrop, point) {
  const minSize = 0.02;
  let left = initialCrop.x;
  let top = initialCrop.y;
  let right = initialCrop.x + initialCrop.width;
  let bottom = initialCrop.y + initialCrop.height;

  if (handle.includes("left")) {
    left = clamp(point.x, 0, right - minSize);
  }
  if (handle.includes("right")) {
    right = clamp(point.x, left + minSize, 1);
  }
  if (handle.includes("top")) {
    top = clamp(point.y, 0, bottom - minSize);
  }
  if (handle.includes("bottom")) {
    bottom = clamp(point.y, top + minSize, 1);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}
