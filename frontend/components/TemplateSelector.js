import { services } from "../lib/services";

export default function TemplateSelector({ selectedService, onChange }) {
  const activeService =
    services.find((service) => service.slug === selectedService) || services[0];

  return (
    <div className="selector-row">
      <label>
        Service Template
        <select
          value={selectedService}
          onChange={(event) => onChange(event.target.value)}
        >
          {services.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <p className="template-helper">
        Active template: <strong>{activeService.name}</strong>
      </p>
    </div>
  );
}
