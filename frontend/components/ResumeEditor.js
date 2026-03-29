import { useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const DEFAULT_TEXT_STYLE = {
  text: "Edit this text",
  fontSize: 24,
  color: "#1f1f1f"
};

function createOverlay(type) {
  if (type === "text") {
    return {
      id: `${type}-${Date.now()}`,
      type,
      x: 0.18,
      y: 0.18,
      width: 0.3,
      height: 0.08,
      ...DEFAULT_TEXT_STYLE
    };
  }

  return {
    id: `${type}-${Date.now()}`,
    type,
    x: 0.18,
    y: 0.28,
    width: 0.32,
    height: 0.08,
    color: type === "highlight" ? "rgba(255, 232, 115, 0.55)" : "#ffffff"
  };
}

export default function ResumeEditor() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Upload a resume PDF or image to start editing.");
  const [documentState, setDocumentState] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [notes, setNotes] = useState("");
  const [overlays, setOverlays] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);

  const selectedOverlay = overlays.find((item) => item.id === selectedOverlayId) || null;
  const currentPreview = documentState?.pages?.[currentPage] || null;
  const currentPreviewUrl = currentPreview
    ? currentPreview.url.startsWith("blob:")
      ? currentPreview.url
      : `${API_BASE_URL}${currentPreview.url}`
    : null;

  const surfaceStyle = useMemo(
    () => ({
      transform: `scale(${zoom}) rotate(${rotation}deg)`,
      transformOrigin: "top center"
    }),
    [rotation, zoom]
  );

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setStatus("Select a resume PDF or image first.");
      return;
    }

    setStatus("Preparing editable preview...");
    setDocumentState(null);
    setOverlays([]);
    setSelectedOverlayId(null);

    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setDocumentState({
        kind: "image",
        pages: [
          {
            page: 0,
            fileName: selectedFile.name,
            url: objectUrl
          }
        ]
      });
      setStatus("Image loaded. Add text, highlight, or whiteout blocks.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("service", "resume-editor");
      formData.append("password", password);

      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData
      });
      const uploadPayload = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadPayload.error || "Upload failed.");
      }

      const previewResponse = await fetch(`${API_BASE_URL}/pdf-preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filePath: uploadPayload.upload.filePath,
          password
        })
      });
      const previewPayload = await previewResponse.json();

      if (!previewResponse.ok) {
        throw new Error(previewPayload.error || "Unable to generate PDF preview.");
      }

      setDocumentState({
        kind: "pdf",
        filePath: uploadPayload.upload.filePath,
        pages: previewPayload.pages
      });
      setCurrentPage(0);
      setStatus("PDF preview ready. Add safe overlays for your resume review copy.");
    } catch (error) {
      setStatus(error.message || "Unable to prepare preview.");
    }
  }

  function addOverlay(type) {
    const nextOverlay = createOverlay(type);
    setOverlays((current) => [...current, nextOverlay]);
    setSelectedOverlayId(nextOverlay.id);
  }

  function updateOverlay(id, patch) {
    setOverlays((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function deleteSelectedOverlay() {
    if (!selectedOverlayId) {
      return;
    }

    setOverlays((current) => current.filter((item) => item.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  }

  function saveDraft() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      "resumeEditorDraft",
      JSON.stringify({
        notes,
        overlays,
        rotation,
        zoom,
        currentPage
      })
    );
    setStatus("Resume editor draft saved locally in this browser.");
  }

  return (
    <div className="upload-layout">
      <form className="panel subtle stack" onSubmit={handleUpload}>
        <label>
          Document type
          <input type="text" value="Resume / CV Editor" readOnly />
        </label>

        <label>
          Resume PDF or image
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
        </label>

        <label>
          Password for locked PDFs
          <input
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Optional"
          />
        </label>

        <button className="button primary" type="submit">
          Open Resume Editor
        </button>

        <p className="template-helper">
          Safe workspace for resumes and personal docs. Use overlays, notes, and review marks.
        </p>

        <div className="resume-tools-grid">
          <button className="button reset-button" type="button" onClick={() => addOverlay("text")}>
            Add Text
          </button>
          <button className="button reset-button" type="button" onClick={() => addOverlay("highlight")}>
            Add Highlight
          </button>
          <button className="button reset-button" type="button" onClick={() => addOverlay("whiteout")}>
            Add Whiteout
          </button>
          <button className="button reset-button" type="button" onClick={saveDraft}>
            Save Draft
          </button>
        </div>

        <div className="resume-tools-grid">
          <label>
            Zoom {zoom.toFixed(1)}x
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>

          <label>
            Rotation {rotation}deg
            <input
              type="range"
              min="-15"
              max="15"
              step="1"
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
            />
          </label>
        </div>

        <label>
          Notes
          <textarea
            className="editor-textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add resume review notes, reminders, or change requests."
          />
        </label>
      </form>

      <section className="panel subtle">
        <div className="template-preview-header">
          <div>
            <span className="service-tag">Resume Editor</span>
            <h2>Editable Preview</h2>
          </div>
        </div>
        <p className="status-line">{status}</p>

        {documentState?.pages?.length ? (
          <div className="selector-row">
            <label>
              Preview page
              <select
                value={currentPage}
                onChange={(event) => setCurrentPage(Number(event.target.value))}
              >
                {documentState.pages.map((page, index) => (
                  <option key={page.fileName || page.url} value={index}>
                    Page {index + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="resume-editor-surface-wrap">
          {currentPreviewUrl ? (
            <div className="resume-editor-surface" style={surfaceStyle}>
              <img src={currentPreviewUrl} alt="Resume preview" className="resume-editor-image" />

              {overlays.map((overlay) => (
                <button
                  key={overlay.id}
                  type="button"
                  className={`resume-overlay resume-overlay-${overlay.type}${
                    overlay.id === selectedOverlayId ? " is-selected" : ""
                  }`}
                  style={{
                    left: `${overlay.x * 100}%`,
                    top: `${overlay.y * 100}%`,
                    width: `${overlay.width * 100}%`,
                    height: `${overlay.height * 100}%`,
                    color: overlay.color,
                    background:
                      overlay.type === "text"
                        ? "transparent"
                        : overlay.color
                  }}
                  onClick={() => setSelectedOverlayId(overlay.id)}
                >
                  {overlay.type === "text" ? (
                    <span style={{ fontSize: `${overlay.fontSize}px`, color: overlay.color }}>
                      {overlay.text}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="code-block">Upload a resume PDF or image to open the editor.</div>
          )}
        </div>

        {selectedOverlay ? (
          <section className="panel subtle adjustment-panel">
            <h3>Selected Overlay</h3>
            <div className="adjustment-grid">
              <label>
                X
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedOverlay.x}
                  onChange={(event) => updateOverlay(selectedOverlay.id, { x: Number(event.target.value) })}
                />
              </label>
              <label>
                Y
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedOverlay.y}
                  onChange={(event) => updateOverlay(selectedOverlay.id, { y: Number(event.target.value) })}
                />
              </label>
              <label>
                Width
                <input
                  type="number"
                  min="0.05"
                  max="1"
                  step="0.01"
                  value={selectedOverlay.width}
                  onChange={(event) => updateOverlay(selectedOverlay.id, { width: Number(event.target.value) })}
                />
              </label>
              <label>
                Height
                <input
                  type="number"
                  min="0.03"
                  max="1"
                  step="0.01"
                  value={selectedOverlay.height}
                  onChange={(event) => updateOverlay(selectedOverlay.id, { height: Number(event.target.value) })}
                />
              </label>
              <label>
                Color
                <input
                  type="color"
                  value={selectedOverlay.color.startsWith("#") ? selectedOverlay.color : "#ffe873"}
                  onChange={(event) => updateOverlay(selectedOverlay.id, { color: event.target.value })}
                />
              </label>
              {selectedOverlay.type === "text" ? (
                <>
                  <label>
                    Text
                    <input
                      type="text"
                      value={selectedOverlay.text}
                      onChange={(event) => updateOverlay(selectedOverlay.id, { text: event.target.value })}
                    />
                  </label>
                  <label>
                    Font Size
                    <input
                      type="number"
                      min="12"
                      max="72"
                      step="1"
                      value={selectedOverlay.fontSize}
                      onChange={(event) => updateOverlay(selectedOverlay.id, { fontSize: Number(event.target.value) })}
                    />
                  </label>
                </>
              ) : null}
            </div>

            <button className="button reset-button" type="button" onClick={deleteSelectedOverlay}>
              Delete Selected Overlay
            </button>
          </section>
        ) : null}
      </section>
    </div>
  );
}
