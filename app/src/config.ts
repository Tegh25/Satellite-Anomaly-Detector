// Owner-specific values (SPEC section 12). A null link is hidden rather than shown as a dead link.
export const config = {
  ownerName: 'Teghveer Singh Ateliey',
  links: {
    github: 'https://github.com/Tegh25/Satellite-Anomaly-Detector' as string | null,
    modelCard: 'https://huggingface.co/Tegh25/satellite-anomaly-reporter-qwen3-4b-lora' as string | null,
    writeup: null as string | null,
    dataset: 'https://zenodo.org/records/12588359' as string | null,
  },
  dataset: {
    citation:
      'Bogdan, R. (2024). OPSSAT-AD - anomaly detection dataset for satellite telemetry [Dataset]. Ruszczak. https://doi.org/10.5281/zenodo.12588359',
    licence: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
  },
  // Phase 2 live-generation Space. Leave null until it exists.
  liveSpaceUrl: null as string | null,
};
