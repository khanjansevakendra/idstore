export const services = [
  {
    slug: "aadhaar",
    name: "Aadhaar",
    group: "Identity",
    description: "Generate Aadhaar-style front and back card previews.",
    cropEnabled: true
  },
  {
    slug: "aadhaar-sample",
    name: "Aadhaar Sample",
    group: "Custom",
    description: "Use your own front/back PNG sample template from the folder or upload temporary overrides.",
    cropEnabled: true
  },
  {
    slug: "pancard-nsdl",
    name: "Pancard (NSDL)",
    group: "Tax",
    description: "Process NSDL PAN card uploads and create output assets.",
    cropEnabled: true
  },
  {
    slug: "pancard-utiitsl",
    name: "Pancard (UTIITSL)",
    group: "Tax",
    description: "Use the UTIITSL PAN template pipeline.",
    cropEnabled: true
  },
  {
    slug: "voter-id",
    name: "Voter ID",
    group: "Identity",
    description: "Extract voter document data for card rendering.",
    cropEnabled: true
  },
  {
    slug: "driving-licence",
    name: "Driving Licence",
    group: "Transport",
    description: "Create licence card layouts with photo and address fields.",
    cropEnabled: true
  },
  {
    slug: "ayushman-card",
    name: "Ayushman Card",
    group: "Health",
    description: "Prepare healthcare benefit card previews.",
    cropEnabled: true,
    adjustmentControls: []
  },
  {
    slug: "e-shram",
    name: "E-Shram",
    group: "Labour",
    description: "Support worker card processing and export.",
    cropEnabled: true,
    adjustmentControls: ["brightness", "saturation"]
  },
  {
    slug: "abha-health-id",
    name: "ABHA Health ID",
    group: "Health",
    description: "Generate ABHA card preview assets.",
    cropEnabled: true,
    adjustmentControls: ["brightness", "saturation"]
  },
  {
    slug: "family-id",
    name: "Family ID",
    group: "Civic",
    description: "Template slot for family identity services.",
    cropEnabled: true
  },
  {
    slug: "farmer-id",
    name: "Farmer ID",
    group: "Agriculture",
    description: "Template slot for agriculture identity services.",
    cropEnabled: true
  },
  {
    slug: "pm-vishwakarma",
    name: "PM Vishwakarma",
    group: "Scheme",
    description: "Support scheme-linked artisan card generation.",
    cropEnabled: true
  },
  {
    slug: "pm-mandhan",
    name: "PM Mandhan",
    group: "Scheme",
    description: "Template slot for pension and welfare services.",
    cropEnabled: true
  },
  {
    slug: "nps-card",
    name: "NPS Card",
    group: "Finance",
    description: "Generate pension system card previews.",
    cropEnabled: true
  },
  {
    slug: "vaccine-certificate",
    name: "Vaccine Certificate",
    group: "Health",
    description: "Render certificate-derived card layouts.",
    cropEnabled: true
  },
  {
    slug: "ummid-railway",
    name: "UMMID Railway",
    group: "Transport",
    description: "Support railway-linked UMMID identity output.",
    cropEnabled: true
  },
  {
    slug: "custom-identity-sample",
    name: "Custom Identity Sample",
    group: "Custom",
    description: "Use your own front/back PNG template from the folder or upload temporary overrides.",
    cropEnabled: true
  }
];

export const DEFAULT_ADJUSTMENT_CONTROLS = [
  "brightness",
  "contrast",
  "saturation",
  "sharpen",
  "contentZoom"
];
