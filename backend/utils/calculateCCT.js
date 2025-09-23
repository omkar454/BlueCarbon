/**
 * Calculate standard-aligned CCT for a project
 * Based on area, saplings, survivalRate, projectYears, and ecosystemType
 */
export function calculateCCT(project) {
  const { area, saplings, survivalRate, projectYears, ecosystemType } = project;

  // Ecosystem factor (adjustable based on standard)
  let ecoFactor = 1;
  if (ecosystemType === "Mangrove") ecoFactor = 1.2;
  else if (ecosystemType === "Seagrass") ecoFactor = 1.1;
  else if (ecosystemType === "Coastal Forest") ecoFactor = 1.3;
  // Add more ecosystem types if needed

  const cct = Math.floor(
    area * saplings * (survivalRate / 100) * projectYears * ecoFactor
  );

  return cct;
}
