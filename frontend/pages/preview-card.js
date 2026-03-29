import { useEffect, useMemo, useState } from "react";
import CardPreview from "../components/CardPreview";
import TemplateSelector from "../components/TemplateSelector";
import { services } from "../lib/services";

const defaultCard = {
  service: "aadhaar",
  serviceName: "Aadhaar",
  fields: {
    name: "Sample Citizen",
    dob: "01/01/1990",
    gender: "Male",
    id_number: "1234 5678 9123",
    address: "221 Demo Street, Jaipur",
    photo: ""
  }
};

export default function PreviewCardPage() {
  const [selectedService, setSelectedService] = useState(defaultCard.service);
  const [latestGeneratedCard, setLatestGeneratedCard] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedCard = window.localStorage.getItem("latestGeneratedCard");

    if (!savedCard) {
      return;
    }

    try {
      const parsedCard = JSON.parse(savedCard);
      setLatestGeneratedCard(parsedCard);

      if (parsedCard.service) {
        setSelectedService(parsedCard.service);
      }
    } catch (_error) {
      window.localStorage.removeItem("latestGeneratedCard");
    }
  }, []);

  useEffect(() => {
    if (!latestGeneratedCard) {
      return;
    }

    if (latestGeneratedCard.service !== selectedService) {
      setLatestGeneratedCard(null);
    }
  }, [latestGeneratedCard, selectedService]);

  const cardData = useMemo(() => {
    const activeService =
      services.find((service) => service.slug === selectedService) || services[0];

    if (latestGeneratedCard && latestGeneratedCard.service === activeService.slug) {
      return {
        service: activeService.slug,
        serviceName: activeService.name,
        fields: latestGeneratedCard.fields,
        files: latestGeneratedCard.files
      };
    }

    return {
      ...defaultCard,
      service: activeService.slug,
      serviceName: activeService.name,
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
        : defaultCard.fields
    };
  }, [latestGeneratedCard, selectedService]);

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="eyebrow">Preview</div>
        <h1>Template preview</h1>
        <p className="muted">
          Inspect the front and back template layout for each service before
          generating the final card assets. If you uploaded a file recently,
          the latest generated PNGs will appear here automatically.
        </p>
        <TemplateSelector
          selectedService={selectedService}
          onChange={setSelectedService}
        />
        <CardPreview cardData={cardData} />
      </section>
    </main>
  );
}
