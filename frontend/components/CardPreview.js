import TemplatePreview from "./TemplatePreview";
import { API_BASE_URL } from "../lib/api";
const OUTPUT_ASPECT_RATIO = "1012 / 638";

function CropLivePreview({ imageUrl, crop, label, adjustments }) {
  const safeWidth = Math.max(crop?.width || 1, 0.001);
  const safeHeight = Math.max(crop?.height || 1, 0.001);
  const previewFilter = [
    `brightness(${adjustments?.brightness || 1})`,
    `contrast(${adjustments?.contrast || 1})`,
    `saturate(${adjustments?.saturation || 1})`
  ].join(" ");

  return (
    <article className="crop-live-preview-card">
      <span className="service-tag">{label}</span>
      <div className="crop-live-frame" style={{ aspectRatio: OUTPUT_ASPECT_RATIO }}>
        <img
          src={imageUrl}
          alt={`${label} live preview`}
          className="crop-live-image"
          style={{
            width: `${100 / safeWidth}%`,
            height: `${100 / safeHeight}%`,
            left: `${-((crop?.x || 0) / safeWidth) * 100}%`,
            top: `${-((crop?.y || 0) / safeHeight) * 100}%`,
            filter: previewFilter,
            transform: `scale(${adjustments?.contentZoom || 1})`,
            transformOrigin: `${((crop?.x || 0) + safeWidth / 2) * 100}% ${((crop?.y || 0) + safeHeight / 2) * 100}%`
          }}
        />
      </div>
    </article>
  );
}

export default function CardPreview({ cardData, previewState }) {
  const { fields, service } = cardData;
  const serviceName = cardData.serviceName || service;
  const files = cardData.files;
  const showGeneratedOutput = Boolean(files) && cardData.service === service;
  const pendingCropSetup = previewState?.pendingCropSetup;
  const liveGeneratedCard = previewState?.generatedCard;
  const previewFiles = liveGeneratedCard?.files || files;
  const cropEnabled = Boolean(cardData.cropEnabled);

  return (
    <>
      {previewFiles ? (
        <section className="rendered-output-panel">
          <div className="template-preview-header">
            <div>
              <span className="service-tag">Latest Generated Output</span>
              <h2>{serviceName}</h2>
            </div>
          </div>

          <div className="generated-preview-grid">
            <article className="generated-preview-card">
              <div className="generated-preview-head">
                <h3>Front PNG</h3>
                <a
                  className="generated-download-link"
                  href={`${API_BASE_URL}${previewFiles.front.url}`}
                  download
                >
                  <span>Download</span>
                  <strong>Front</strong>
                </a>
              </div>
              <img
                src={`${API_BASE_URL}${previewFiles.front.url}`}
                alt="Generated front card"
                className="generated-preview-image"
              />
            </article>

            <article className="generated-preview-card">
              <div className="generated-preview-head">
                <h3>Back PNG</h3>
                <a
                  className="generated-download-link"
                  href={`${API_BASE_URL}${previewFiles.back.url}`}
                  download
                >
                  <span>Download</span>
                  <strong>Back</strong>
                </a>
              </div>
              <img
                src={`${API_BASE_URL}${previewFiles.back.url}`}
                alt="Generated back card"
                className="generated-preview-image"
              />
            </article>
          </div>
        </section>
      ) : null}

      {cropEnabled && pendingCropSetup ? (
        <section className="template-preview-panel">
          <div className="template-preview-header">
            <div>
              <span className="service-tag">Live Crop Preview</span>
              <h2>{serviceName}</h2>
            </div>
          </div>
          <div className="crop-live-grid">
            <CropLivePreview
              imageUrl={`${API_BASE_URL}${pendingCropSetup.pages[pendingCropSetup.front.page]?.url}`}
              crop={pendingCropSetup.front}
              label="Front Preview"
              adjustments={pendingCropSetup.adjustments}
            />
            <CropLivePreview
              imageUrl={`${API_BASE_URL}${pendingCropSetup.pages[pendingCropSetup.back.page]?.url}`}
              crop={pendingCropSetup.back}
              label="Back Preview"
              adjustments={pendingCropSetup.adjustments}
            />
          </div>
        </section>
      ) : null}

      {!cropEnabled || (!pendingCropSetup && !previewFiles) ? (
        <TemplatePreview service={service} serviceName={serviceName} fields={fields} />
      ) : null}
    </>
  );
}
