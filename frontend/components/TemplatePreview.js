import { API_BASE_URL, HAS_API_BASE_URL, getMissingApiBaseUrlMessage } from "../lib/api";

const templateThemes = {
  aadhaar: {
    accent: "#c96c3a",
    label: "Aadhaar-Inspired Sample"
  },
  pancard: {
    accent: "#1d5b93",
    label: "PAN Layout"
  },
  voter: {
    accent: "#0f6f5f",
    label: "Voter Layout"
  },
  driving: {
    accent: "#84521e",
    label: "Driving Layout"
  },
  student: {
    accent: "#1468b7",
    label: "Custom Identity Template"
  },
  default: {
    accent: "#5c5b88",
    label: "Generic Layout"
  }
};

function resolveTheme(service) {
  if (service.startsWith("aadhaar")) {
    if (service.startsWith("aadhaar-sample")) {
      return templateThemes.student;
    }
    return templateThemes.aadhaar;
  }
  if (service.startsWith("pancard")) {
    return templateThemes.pancard;
  }
  if (service.startsWith("voter")) {
    return templateThemes.voter;
  }
  if (service.startsWith("driving")) {
    return templateThemes.driving;
  }
  if (service.startsWith("student-id") || service.startsWith("custom-identity")) {
    return templateThemes.student;
  }

  return templateThemes.default;
}

export default function TemplatePreview({ service, serviceName, fields }) {
  const theme = resolveTheme(service);
  const isAadhaar =
    service.startsWith("aadhaar") && !service.startsWith("aadhaar-sample");
  const isStudentCard =
    service.startsWith("student-id") ||
    service.startsWith("custom-identity") ||
    service.startsWith("aadhaar-sample");
  const showFolderTemplate =
    service.startsWith("custom-identity") || service.startsWith("aadhaar-sample");

  return (
    <section className="template-preview-panel">
      <div className="template-preview-header">
        <div>
          <span className="service-tag">{theme.label}</span>
          <h2>{serviceName}</h2>
        </div>
        <span
          className="template-color-dot"
          style={{ backgroundColor: theme.accent }}
          aria-hidden="true"
        />
      </div>

      <div className="template-preview-grid">
        {isAadhaar ? (
          <>
            <article className="template-artboard aadhaar-artboard">
              <div className="template-artboard-top">
                <span>Front Template</span>
                <strong>{serviceName}</strong>
              </div>
              <div className="aadhaar-template-card">
                <div className="aadhaar-watermark">SAMPLE PREVIEW</div>
                <div className="aadhaar-template-header">
                  <div className="aadhaar-emblem">ID</div>
                  <div className="aadhaar-title-block">
                    <div className="aadhaar-saffron" />
                    <div className="aadhaar-title-hindi">भारत पहचान नमूना</div>
                    <div className="aadhaar-green" />
                    <div className="aadhaar-title-english">India Identity Sample</div>
                  </div>
                  <div className="aadhaar-sunmark">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="aadhaar-template-body">
                  <div className="template-photo-slot aadhaar-photo-slot">Photo</div>
                  <div className="template-copy">
                    <p><strong>Name</strong> {fields.name}</p>
                    <p><strong>DOB</strong> {fields.dob}</p>
                    <p><strong>Gender</strong> {fields.gender}</p>
                    <p><strong>ID</strong> {fields.id_number}</p>
                    <p><strong>Address</strong> {fields.address}</p>
                  </div>
                </div>

                <div className="aadhaar-bottom-band">
                  <span className="aadhaar-bottom-line" />
                  <p>Mera Sample Card</p>
                </div>
              </div>
            </article>

            <article className="template-artboard aadhaar-artboard">
              <div className="template-artboard-top">
                <span>Back Template</span>
                <strong>Instruction Layout</strong>
              </div>
              <div className="aadhaar-template-card aadhaar-template-back">
                <div className="aadhaar-watermark">SAMPLE PREVIEW</div>
                <div className="aadhaar-note-box">
                  <p>
                    This is a non-official preview template for internal
                    testing, extraction review, and operator verification.
                  </p>
                  <p>
                    Do not use as a government document, identity proof, or
                    public-facing output.
                  </p>
                </div>
                <div className="template-lines">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="aadhaar-bottom-band">
                  <span className="aadhaar-bottom-line" />
                  <p>Custom Preview Layout</p>
                </div>
              </div>
            </article>
          </>
        ) : isStudentCard ? (
          <>
            <article className="template-artboard student-artboard">
              {showFolderTemplate ? (
                <div className="folder-template-preview clean-template-preview">
                  {HAS_API_BASE_URL ? (
                    <img
                      src={`${API_BASE_URL}/template-assets/other_cards/front.png`}
                      alt="Custom front template from folder"
                      className="folder-template-image"
                    />
                  ) : (
                    <p className="muted">{getMissingApiBaseUrlMessage()}</p>
                  )}
                </div>
              ) : (
                <div className="student-card">
                  <div className="student-header-band">
                    <div className="student-logo">GS</div>
                    <div className="student-school-copy">
                      <h3>Glory Higher Secondary School</h3>
                      <p>Your Address Type Here</p>
                      <span>Phone No. 00 - 00000</span>
                    </div>
                  </div>

                  <>
                    <div className="student-title-pill">STUDENT IDENTITY CARD</div>

                    <div className="student-main-grid">
                      <div className="student-fields">
                        <p><strong>Student ID</strong><span>:</span>{fields.id_number || "123456"}</p>
                        <p><strong>Student Name</strong><span>:</span>{fields.name || "First Name Last Name"}</p>
                        <p><strong>Father&apos;s Name</strong><span>:</span>{fields.father_name || "Surname First Name"}</p>
                        <p><strong>Contact No</strong><span>:</span>{fields.contact_no || "0123456789"}</p>
                        <p><strong>Class</strong><span>:</span>{fields.class_name || "VI"}</p>
                        <p><strong>Roll No</strong><span>:</span>{fields.roll_no || "10"}</p>
                        <p><strong>Issue Date</strong><span>:</span>{fields.issue_date || "2023/06/16"}</p>
                        <p><strong>Valid Date</strong><span>:</span>{fields.valid_date || "2024/06/17"}</p>
                      </div>

                      <div className="student-photo-area">
                        <div className="student-photo-frame">Photo</div>
                        <div className="student-signature-line" />
                        <div className="student-signature-text">Signature Here</div>
                      </div>
                    </div>
                  </>
                  <div className="student-footer-band" />
                </div>
              )}
            </article>

            <article className="template-artboard student-artboard">
              {showFolderTemplate ? (
                <div className="folder-template-preview clean-template-preview">
                  {HAS_API_BASE_URL ? (
                    <img
                      src={`${API_BASE_URL}/template-assets/other_cards/back.png`}
                      alt="Custom back template from folder"
                      className="folder-template-image"
                    />
                  ) : (
                    <p className="muted">{getMissingApiBaseUrlMessage()}</p>
                  )}
                </div>
              ) : (
                <div className="student-card student-card-back">
                  <div className="student-header-band">
                    <div className="student-logo">GS</div>
                    <div className="student-school-copy">
                      <h3>Student Card Notes</h3>
                      <p>Emergency contact and school use information</p>
                      <span>Custom reverse layout</span>
                    </div>
                  </div>

                  <div className="student-back-copy">
                    <div className="template-lines">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <p className="muted">
                      Add transport route, blood group, guardian signature, or school
                      instructions here.
                    </p>
                  </div>
                  <div className="student-footer-band" />
                </div>
              )}
            </article>
          </>
        ) : (
          <>
            <article className="template-artboard">
              <div className="template-artboard-top">
                <span>Front Template</span>
                <strong>{serviceName}</strong>
              </div>
              <div className="template-card-surface">
                <div className="template-photo-slot">Photo</div>
                <div className="template-copy">
                  <p><strong>Name</strong> {fields.name}</p>
                  <p><strong>DOB</strong> {fields.dob}</p>
                  <p><strong>Gender</strong> {fields.gender}</p>
                  <p><strong>ID</strong> {fields.id_number}</p>
                  <p><strong>Address</strong> {fields.address}</p>
                </div>
              </div>
              <div
                className="template-accent-bar"
                style={{ backgroundColor: theme.accent }}
              />
            </article>

            <article className="template-artboard">
              <div className="template-artboard-top">
                <span>Back Template</span>
                <strong>Mapped Fields</strong>
              </div>
              <div className="template-card-surface template-card-back">
                <div className="template-lines">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <p className="muted">
                  Address blocks, QR region, or service-specific instructions can be
                  rendered here.
                </p>
              </div>
              <div
                className="template-accent-bar"
                style={{ backgroundColor: theme.accent }}
              />
            </article>
          </>
        )}
      </div>
    </section>
  );
}
