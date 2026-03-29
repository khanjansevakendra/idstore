import Link from "next/link";
import { useState } from "react";
import CropEditor from "./CropEditor";
import { DEFAULT_ADJUSTMENT_CONTROLS } from "../lib/services";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const BASE_ADJUSTMENTS = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  sharpen: 0,
  contentZoom: 1
};
const DEFAULT_ADJUSTMENTS = {
  brightness: 1.08,
  contrast: 1.12,
  saturation: 1.28,
  sharpen: 1.4,
  contentZoom: 1
};
const SERVICE_DEFAULT_ADJUSTMENTS = {
  "abha-health-id": {
    brightness: 1.06,
    saturation: 1.16
  },
  "e-shram": {
    brightness: 1.04,
    saturation: 1.14
  }
};

function resolveServiceAdjustments(service, overrides = {}) {
  const allowedControls = service.adjustmentControls || DEFAULT_ADJUSTMENT_CONTROLS;
  const nextAdjustments = { ...BASE_ADJUSTMENTS };
  const serviceDefaults = SERVICE_DEFAULT_ADJUSTMENTS[service.slug] || {};

  for (const key of allowedControls) {
    nextAdjustments[key] = serviceDefaults[key] ?? DEFAULT_ADJUSTMENTS[key];
  }

  for (const key of allowedControls) {
    if (typeof overrides[key] === "number") {
      nextAdjustments[key] = overrides[key];
    }
  }

  return nextAdjustments;
}

export default function UploadForm({ service, onPreviewStateChange }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [generatedCard, setGeneratedCard] = useState(null);
  const [pendingCropSetup, setPendingCropSetup] = useState(null);
  const cropEnabled = Boolean(service.cropEnabled);
  const needsCustomTemplate =
    service.slug === "custom-identity-sample" ||
    service.slug === "aadhaar-sample";
  const allowedAdjustmentControls =
    service.adjustmentControls || DEFAULT_ADJUSTMENT_CONTROLS;

  function syncPreviewState(nextState) {
    onPreviewStateChange?.(nextState);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setStatus("Please select a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("document", selectedFile);
    formData.append("service", service.slug);
    formData.append("password", password);

    setStatus("Uploading and extracting data...");
    setResult(null);
    setGeneratedCard(null);
    setPendingCropSetup(null);
    syncPreviewState({
      pendingCropSetup: null,
      generatedCard: null
    });

    try {
      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData
      });
      const uploadPayload = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadPayload.error || "Upload failed.");
      }

      const extractResponse = await fetch(`${API_BASE_URL}/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          service: service.slug,
          uploadId: uploadPayload.upload.id,
          filePath: uploadPayload.upload.filePath,
          password
        })
      });

      const extractPayload = await extractResponse.json();
      if (!extractResponse.ok) {
        throw new Error(extractPayload.error || "Extraction failed.");
      }

      if (cropEnabled && selectedFile.name.toLowerCase().endsWith(".pdf")) {
        const cropConfigResponse = await fetch(
          `${API_BASE_URL}/crop-config/${service.slug}`
        );
        const cropConfigPayload = await cropConfigResponse.json();

        if (cropConfigPayload.config) {
          const generated = await generateFromSource(
            uploadPayload.upload.filePath,
            extractPayload.fields
          );
          setResult(extractPayload);
          setGeneratedCard(generated);
          syncPreviewState({
            pendingCropSetup: null,
            generatedCard: generated
          });
          setStatus("Saved crop preset applied automatically.");
          return;
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
          throw new Error(previewPayload.error || "Preview generation failed.");
        }

        const nextPendingCropSetup = {
          filePath: uploadPayload.upload.filePath,
          fields: extractPayload.fields,
          pages: previewPayload.pages,
          adjustments: resolveServiceAdjustments(service),
          front: {
            page: 0,
            x: 0.15,
            y: 0.1,
            width: 0.7,
            height: 0.35
          },
          back: {
            page: Math.min(1, Math.max(previewPayload.pages.length - 1, 0)),
            x: 0.15,
            y: 0.1,
            width: 0.7,
            height: 0.35
          }
        };
        setPendingCropSetup(nextPendingCropSetup);
        syncPreviewState({
          pendingCropSetup: nextPendingCropSetup,
          generatedCard: null
        });
        setResult(extractPayload);
        setStatus("Set front and back crop, then save the preset.");
        return;
      }

      const generatePayload = await generateFromSource(
        uploadPayload.upload.filePath,
        extractPayload.fields
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "latestGeneratedCard",
          JSON.stringify({
            service: service.slug,
            serviceName: service.name,
            fields: extractPayload.fields,
            files: generatePayload.files
          })
        );
      }

      setResult(extractPayload);
      setGeneratedCard(generatePayload);
      syncPreviewState({
        pendingCropSetup: null,
        generatedCard: generatePayload
      });
      setStatus("Extraction and card generation complete.");
    } catch (error) {
      setStatus(error.message || "Upload failed.");
    }
  }

  async function generateFromSource(filePath, fields) {
    const generateResponse = await fetch(`${API_BASE_URL}/generate-card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service: service.slug,
        fields,
        templatePath: null,
        backTemplatePath: null,
        sourceFilePath: filePath,
        password
      })
    });

    const generatePayload = await generateResponse.json();
    if (!generateResponse.ok) {
      throw new Error(generatePayload.error || "Card generation failed.");
    }

    return generatePayload;
  }

  async function handleSaveCropPreset() {
    if (!pendingCropSetup) {
      return;
    }

    try {
      const saveResponse = await fetch(`${API_BASE_URL}/crop-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          service: service.slug,
          front: pendingCropSetup.front,
          back: pendingCropSetup.back,
          adjustments: resolveServiceAdjustments(service, pendingCropSetup.adjustments)
        })
      });
      const savePayload = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(savePayload.error || "Unable to save crop preset.");
      }

      const generated = await generateFromSource(
        pendingCropSetup.filePath,
        pendingCropSetup.fields
      );

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "latestGeneratedCard",
          JSON.stringify({
            service: service.slug,
            serviceName: service.name,
            fields: pendingCropSetup.fields,
            files: generated.files
          })
        );
      }

      setGeneratedCard(generated);
      setPendingCropSetup(null);
      syncPreviewState({
        pendingCropSetup: null,
        generatedCard: generated
      });
      setStatus("Crop preset saved. Future PDF uploads will auto-crop.");
    } catch (error) {
      setStatus(error.message || "Unable to save crop preset.");
    }
  }

  function handleAdjustmentChange(key, value) {
    if (!allowedAdjustmentControls.includes(key)) {
      return;
    }

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return;
    }

    setPendingCropSetup((current) => {
      const nextState = {
        ...current,
        adjustments: {
          ...current.adjustments,
          [key]: numeric
        }
      };
      syncPreviewState({
        pendingCropSetup: nextState,
        generatedCard: null
      });
      return nextState;
    });
  }

  async function handleResetCropPreset() {
    try {
      await fetch(`${API_BASE_URL}/crop-config/${service.slug}`, {
        method: "DELETE"
      });

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("latestGeneratedCard");
      }

      setGeneratedCard(null);
      setPendingCropSetup(null);
      setResult(null);
      syncPreviewState({
        pendingCropSetup: null,
        generatedCard: null
      });
      setStatus("Saved crop preset reset ho gaya. Ab next PDF upload par fresh crop set kar sakte ho.");
    } catch (error) {
      setStatus(error.message || "Crop preset reset nahi ho paya.");
    }
  }

  return (
    <div className="upload-layout">
      <form className="panel subtle stack" onSubmit={handleSubmit}>
        <label>
          Active service
          <input type="text" value={service.name} readOnly />
        </label>

        <label>
          PDF or image
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
          Upload and Generate
        </button>

        {cropEnabled ? (
          <p className="template-helper">
            PDF uploads can use saved front/back crop presets. Set crop once and
            future uploads for this service will auto-apply it.
          </p>
        ) : null}

        {needsCustomTemplate ? (
          <p className="template-helper">
            Permanent default templates are read from
            <strong> templates/other_cards/front.png</strong> and
            <strong> templates/other_cards/back.png</strong>. Text and photo
            positions come from
            <strong> templates/other_cards/fields.json</strong>.
          </p>
        ) : null}

        {cropEnabled ? (
          <button className="button reset-button" type="button" onClick={handleResetCropPreset}>
            Reset Saved Crop
          </button>
        ) : null}
      </form>

      <section className="panel subtle">
        <h2>Extraction Result</h2>
        <p className="status-line">{status || "Waiting for upload."}</p>
        {pendingCropSetup ? (
          <div className="crop-grid">
            <CropEditor
              imageUrl={`${API_BASE_URL}${pendingCropSetup.pages[pendingCropSetup.front.page]?.url}`}
              crop={pendingCropSetup.front}
              label="Front Crop"
              adjustments={pendingCropSetup.adjustments}
              showLivePreview={false}
              page={pendingCropSetup.front.page}
              pageOptions={pendingCropSetup.pages}
              onPageChange={(nextPage) =>
                setPendingCropSetup((current) => {
                  const nextState = {
                    ...current,
                    front: {
                      ...current.front,
                      page: nextPage
                    }
                  };
                  syncPreviewState({
                    pendingCropSetup: nextState,
                    generatedCard: null
                  });
                  return nextState;
                })
              }
              onChange={(nextCrop) =>
                setPendingCropSetup((current) => {
                  const nextState = {
                    ...current,
                    front: nextCrop
                  };
                  syncPreviewState({
                    pendingCropSetup: nextState,
                    generatedCard: null
                  });
                  return nextState;
                })
              }
            />
            <CropEditor
              imageUrl={`${API_BASE_URL}${pendingCropSetup.pages[pendingCropSetup.back.page]?.url}`}
              crop={pendingCropSetup.back}
              label="Back Crop"
              adjustments={pendingCropSetup.adjustments}
              showLivePreview={false}
              page={pendingCropSetup.back.page}
              pageOptions={pendingCropSetup.pages}
              onPageChange={(nextPage) =>
                setPendingCropSetup((current) => {
                  const nextState = {
                    ...current,
                    back: {
                      ...current.back,
                      page: nextPage
                    }
                  };
                  syncPreviewState({
                    pendingCropSetup: nextState,
                    generatedCard: null
                  });
                  return nextState;
                })
              }
              onChange={(nextCrop) =>
                setPendingCropSetup((current) => {
                  const nextState = {
                    ...current,
                    back: nextCrop
                  };
                  syncPreviewState({
                    pendingCropSetup: nextState,
                    generatedCard: null
                  });
                  return nextState;
                })
              }
            />
            <section className="panel subtle adjustment-panel">
              <h3>One-Time Image Settings</h3>
              <p className="template-helper">
                Ye values ek baar save hongi aur future crop outputs par automatic apply hongi.
              </p>
              <div className="adjustment-grid">
                {allowedAdjustmentControls.includes("brightness") ? (
                  <label>
                    Brightness {pendingCropSetup.adjustments.brightness.toFixed(2)}x
                    <input
                      type="range"
                      min="0.8"
                      max="1.5"
                      step="0.01"
                      value={pendingCropSetup.adjustments.brightness}
                      onChange={(event) => handleAdjustmentChange("brightness", event.target.value)}
                    />
                  </label>
                ) : null}
                {allowedAdjustmentControls.includes("contrast") ? (
                  <label>
                    Contrast {pendingCropSetup.adjustments.contrast.toFixed(2)}x
                    <input
                      type="range"
                      min="0.8"
                      max="1.6"
                      step="0.01"
                      value={pendingCropSetup.adjustments.contrast}
                      onChange={(event) => handleAdjustmentChange("contrast", event.target.value)}
                    />
                  </label>
                ) : null}
                {allowedAdjustmentControls.includes("saturation") ? (
                  <label>
                    Saturation {pendingCropSetup.adjustments.saturation.toFixed(2)}x
                    <input
                      type="range"
                      min="0.8"
                      max="1.8"
                      step="0.01"
                      value={pendingCropSetup.adjustments.saturation}
                      onChange={(event) => handleAdjustmentChange("saturation", event.target.value)}
                    />
                  </label>
                ) : null}
                {allowedAdjustmentControls.includes("sharpen") ? (
                  <label>
                    Sharpen {pendingCropSetup.adjustments.sharpen.toFixed(2)}x
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.05"
                      value={pendingCropSetup.adjustments.sharpen}
                      onChange={(event) => handleAdjustmentChange("sharpen", event.target.value)}
                    />
                  </label>
                ) : null}
                {allowedAdjustmentControls.includes("contentZoom") ? (
                  <label>
                    PDF Font Size {pendingCropSetup.adjustments.contentZoom.toFixed(2)}x
                    <input
                      type="range"
                      min="1"
                      max="1.8"
                      step="0.01"
                      value={pendingCropSetup.adjustments.contentZoom}
                      onChange={(event) => handleAdjustmentChange("contentZoom", event.target.value)}
                    />
                  </label>
                ) : null}
              </div>
            </section>
            <button className="button primary" type="button" onClick={handleSaveCropPreset}>
              Save Crop Preset
            </button>
          </div>
        ) : null}
        {generatedCard?.files ? (
          <div className="generated-preview-grid">
            <article className="generated-preview-card">
              <h3>Front Output</h3>
              <img
                src={`${API_BASE_URL}${generatedCard.files.front.url}`}
                alt="Generated front card"
                className="generated-preview-image"
              />
              <a
                className="generated-download-link"
                href={`${API_BASE_URL}${generatedCard.files.front.url}`}
                target="_blank"
                rel="noreferrer"
              >
                Open front PNG
              </a>
            </article>

            <article className="generated-preview-card">
              <h3>Back Output</h3>
              <img
                src={`${API_BASE_URL}${generatedCard.files.back.url}`}
                alt="Generated back card"
                className="generated-preview-image"
              />
              <a
                className="generated-download-link"
                href={`${API_BASE_URL}${generatedCard.files.back.url}`}
                target="_blank"
                rel="noreferrer"
              >
                Open back PNG
              </a>
            </article>
          </div>
        ) : null}
        {generatedCard?.files ? (
          <Link className="button primary preview-button" href="/preview-card">
            Open full preview page
          </Link>
        ) : null}
        <pre className="code-block">
          {JSON.stringify(
            {
              extracted: result,
              generated: generatedCard
            },
            null,
            2
          ) || "No extracted data yet."}
        </pre>
      </section>
    </div>
  );
}
