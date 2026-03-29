import Link from "next/link";
import { services } from "../lib/services";

export default function ServiceGrid() {
  return (
    <div className="service-grid">
      {services.map((service, index) => (
        <Link
          key={service.slug}
          href={`/upload-file?service=${service.slug}`}
          className="service-card"
        >
          <div className="service-card-topline">
            <span className="service-card-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="service-tag">{service.group}</span>
          </div>
          <h2>{service.name}</h2>
          <p>{service.description}</p>
          <span className="card-link-copy">Open service flow</span>
        </Link>
      ))}
    </div>
  );
}
