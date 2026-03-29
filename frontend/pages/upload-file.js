import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import CardPreview from "../components/CardPreview";
import TemplateSelector from "../components/TemplateSelector";
import UploadForm from "../components/UploadForm";
import { services } from "../lib/services";

export default function UploadFilePage() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState(
    router.query.service || services[0].slug
  );
  const [previewState, setPreviewState] = useState({
    pendingCropSetup: null,
    generatedCard: null
  });

  const activeService = useMemo(
    () => services.find((service) => service.slug === selectedService) || services[0],
    [selectedService]
  );

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="eyebrow">Upload</div>
        <h1>Upload source document</h1>
        <p className="muted">
          Choose a service, upload a PDF or image, and send it to the extraction
          pipeline.
        </p>

        <TemplateSelector
          selectedService={selectedService}
          onChange={(nextService) => {
            setSelectedService(nextService);
            setPreviewState({
              pendingCropSetup: null,
              generatedCard: null
            });
          }}
        />

        <CardPreview
          cardData={{
            service: activeService.slug,
            serviceName: activeService.name,
            cropEnabled: activeService.cropEnabled,
            fields:
              activeService.slug === "custom-identity-sample" ||
              activeService.slug === "aadhaar-sample"
                ? {
                    name_hi: "",
                    name_en: "",
                    dob: "",
                    gender: "",
                    masked_id: "",
                    vid: "",
                    issued_date: "",
                    photo: ""
                  }
                : {
                    name: "Preview Holder",
                    dob: "01/01/1990",
                    gender: "Male",
                    id_number: "TEMP-0001",
                    address: "Template preview address block",
                    photo: ""
                  }
          }}
          previewState={previewState}
        />

        <UploadForm service={activeService} onPreviewStateChange={setPreviewState} />
      </section>
    </main>
  );
}
