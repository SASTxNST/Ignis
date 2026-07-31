import {
  G0,
  ISA_TEMPERATURE_SEA_LEVEL,
  ISA_PRESSURE_SEA_LEVEL,
  ISA_LAPSE_RATE_TROPOSPHERE,
  ISA_TROPOPAUSE_ALTITUDE,
  ISA_STRATOSPHERE_ISOTHERMAL_CEILING,
  ISA_STRATOSPHERE_1_CEILING,
  ISA_STRATOSPHERE_2_CEILING,
  ISA_STRATOSPHERE_3_CEILING,
  ISA_MESOSPHERE_1_CEILING,
  ISA_MESOSPHERE_2_CEILING,
  ISA_MESOPAUSE_CEILING,
  ISA_LAPSE_RATE_STRATOSPHERE_1,
  ISA_LAPSE_RATE_STRATOSPHERE_2,
  ISA_LAPSE_RATE_MESOSPHERE_1,
  ISA_LAPSE_RATE_MESOSPHERE_2,
  GAS_CONSTANT_AIR,
  GAMMA_AIR,
  SUTHERLAND_REF_TEMPERATURE,
  SUTHERLAND_REF_VISCOSITY,
  SUTHERLAND_CONSTANT,
} from "./constants";
import { AtmosphericState } from "./types";

// -----------------------------------------------------------
// ISA layer definition
// -----------------------------------------------------------

interface ISALayerDef {
  baseAlt: number;
  lapseRate: number;
  baseTemp: number;
  basePressure: number;
}

function layerTemperatureAt(layer: ISALayerDef, alt: number): number {
  return layer.baseTemp + layer.lapseRate * (alt - layer.baseAlt);
}

function layerPressureAt(layer: ISALayerDef, alt: number): number {
  const dh = alt - layer.baseAlt;
  if (Math.abs(layer.lapseRate) < 1e-12) {
    // Isothermal layer
    return layer.basePressure * Math.exp(-G0 * dh / (GAS_CONSTANT_AIR * layer.baseTemp));
  }
  const T = layerTemperatureAt(layer, alt);
  const exponent = G0 / (layer.lapseRate * GAS_CONSTANT_AIR);
  return layer.basePressure * Math.pow(layer.baseTemp / T, exponent);
}

// -----------------------------------------------------------
// Build ISA layers — precompute base temperature and pressure
// at each layer boundary from sea level upward.
// -----------------------------------------------------------

function buildISALayers(): ISALayerDef[] {
  const layers: ISALayerDef[] = [];

  // Layer 0: Troposphere (sea level to tropopause)
  layers.push({
    baseAlt: 0,
    lapseRate: -ISA_LAPSE_RATE_TROPOSPHERE,
    baseTemp: ISA_TEMPERATURE_SEA_LEVEL,
    basePressure: ISA_PRESSURE_SEA_LEVEL,
  });

  // Layer 1: Tropopause (isothermal to 20 km)
  const prev1 = layers[layers.length - 1];
  const topAlt1 = ISA_TROPOPAUSE_ALTITUDE;
  layers.push({
    baseAlt: topAlt1,
    lapseRate: 0,
    baseTemp: layerTemperatureAt(prev1, topAlt1),
    basePressure: layerPressureAt(prev1, topAlt1),
  });

  // Layer 2: Stratosphere 1 (20–32 km, +0.001 K/m)
  const prev2 = layers[layers.length - 1];
  const topAlt2 = ISA_STRATOSPHERE_ISOTHERMAL_CEILING;
  layers.push({
    baseAlt: topAlt2,
    lapseRate: ISA_LAPSE_RATE_STRATOSPHERE_1,
    baseTemp: layerTemperatureAt(prev2, topAlt2),
    basePressure: layerPressureAt(prev2, topAlt2),
  });

  // Layer 3: Stratosphere 2 (32–47 km, +0.0028 K/m)
  const prev3 = layers[layers.length - 1];
  const topAlt3 = ISA_STRATOSPHERE_1_CEILING;
  layers.push({
    baseAlt: topAlt3,
    lapseRate: ISA_LAPSE_RATE_STRATOSPHERE_2,
    baseTemp: layerTemperatureAt(prev3, topAlt3),
    basePressure: layerPressureAt(prev3, topAlt3),
  });

  // Layer 4: Stratosphere 3 (47–51 km, isothermal)
  const prev4 = layers[layers.length - 1];
  const topAlt4 = ISA_STRATOSPHERE_2_CEILING;
  layers.push({
    baseAlt: topAlt4,
    lapseRate: 0,
    baseTemp: layerTemperatureAt(prev4, topAlt4),
    basePressure: layerPressureAt(prev4, topAlt4),
  });

  // Layer 5: Mesosphere 1 (51–71 km, −0.0028 K/m)
  const prev5 = layers[layers.length - 1];
  const topAlt5 = ISA_STRATOSPHERE_3_CEILING;
  layers.push({
    baseAlt: topAlt5,
    lapseRate: ISA_LAPSE_RATE_MESOSPHERE_1,
    baseTemp: layerTemperatureAt(prev5, topAlt5),
    basePressure: layerPressureAt(prev5, topAlt5),
  });

  // Layer 6: Mesosphere 2 (71–84.852 km, −0.002 K/m)
  const prev6 = layers[layers.length - 1];
  const topAlt6 = ISA_MESOSPHERE_1_CEILING;
  layers.push({
    baseAlt: topAlt6,
    lapseRate: ISA_LAPSE_RATE_MESOSPHERE_2,
    baseTemp: layerTemperatureAt(prev6, topAlt6),
    basePressure: layerPressureAt(prev6, topAlt6),
  });

  // Layer 7: Mesopause (84.852–90 km, isothermal)
  const prev7 = layers[layers.length - 1];
  const topAlt7 = ISA_MESOSPHERE_2_CEILING;
  layers.push({
    baseAlt: topAlt7,
    lapseRate: 0,
    baseTemp: layerTemperatureAt(prev7, topAlt7),
    basePressure: layerPressureAt(prev7, topAlt7),
  });

  return layers;
}

const ISA_LAYERS: ISALayerDef[] = buildISALayers();

// -----------------------------------------------------------
// Sutherland's law: dynamic viscosity of air
// -----------------------------------------------------------

function sutherlandViscosity(temperatureK: number): number {
  const T = temperatureK;
  const T_ref = SUTHERLAND_REF_TEMPERATURE;
  return SUTHERLAND_REF_VISCOSITY
    * Math.pow(T / T_ref, 1.5)
    * (T_ref + SUTHERLAND_CONSTANT) / (T + SUTHERLAND_CONSTANT);
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/**
 * Returns atmospheric state (temperature, pressure, density, speed of sound,
 * dynamic viscosity) at a given geometric altitude using the International
 * Standard Atmosphere (ISA) layered model.
 *
 * Covers the full range from sea level through mesopause (0–90 km) and
 * continues the mesopause isothermal layer above it, so density decays
 * exponentially toward (but never reaching) zero. This is deliberately
 * CONTINUOUS at all altitudes — a hard "vacuum above 100 km" cutoff would
 * create a jump discontinuity in drag (density, temperature, speed of sound
 * snapping to zero), which breaks adaptive integrators: the RK45 error
 * estimate becomes dominated by the jump and never converges.
 */
export function getAtmosphere(altitudeMeters: number): AtmosphericState {
  const h = Math.max(0, altitudeMeters);

  // Find the layer containing this altitude
  let layer = ISA_LAYERS[0];
  for (let i = ISA_LAYERS.length - 1; i >= 0; i--) {
    if (h >= ISA_LAYERS[i].baseAlt) {
      layer = ISA_LAYERS[i];
      break;
    }
  }

  // Compute temperature
  const T = layerTemperatureAt(layer, h);

  // Compute pressure via hydrostatic integration from layer base
  const P = layerPressureAt(layer, h);

  // Density from ideal gas law
  const rho = P / (GAS_CONSTANT_AIR * T);

  // Speed of sound
  const speedOfSound = Math.sqrt(GAMMA_AIR * GAS_CONSTANT_AIR * T);

  // Dynamic viscosity via Sutherland's law
  const dynamicViscosity = sutherlandViscosity(T);

  return {
    temperature: T,
    pressure: P,
    density: rho,
    speedOfSound,
    dynamicViscosity,
  };
}

/**
 * Convenience: returns only air density at altitude. Avoids the full
 * AtmosphericState object when only density is needed (e.g. drag computation).
 */
export function airDensityAt(altitudeMeters: number): number {
  return getAtmosphere(altitudeMeters).density;
}

/**
 * Convenience: returns speed of sound at altitude.
 */
export function speedOfSoundAt(altitudeMeters: number): number {
  return getAtmosphere(altitudeMeters).speedOfSound;
}
