import { Vector2 } from "../types";
import { pitchProgram } from "./pitchProgram";
import { rollProgram } from "./rollProgram";
import { velocityTurn } from "./velocityTurn";
import { guidanceMixer } from "./guidanceMixer";
import { GuidanceState, GuidanceVector } from "./types";
import { pegGuidance } from "./peg/peg";
import { MissionProfile } from "./mission/mission";
import { LEO_500KM } from "./mission/presets";

/**
 * Smoothstep (quintic, C2-continuous): 0 for x <= 0, 1 for x >= 1.
 * Used to make the guidance weight schedule continuous in altitude.
 */
function smoothstep5(x: number): number {
    const t = Math.min(1, Math.max(0, x));
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Altitude-band weight schedule for the pitch/velocity blend.
 *
 * The ORIGINAL schedule was piecewise-constant with hard switches at 1000 m,
 * 20 km and 50 km:
 *   alt < 1 km   -> pitch 1.0, velocity 0.0
 *   1-20 km      -> pitch 0.8, velocity 0.2
 *   20-50 km     -> pitch 0.5, velocity 0.5
 *   alt > 50 km  -> pitch 0.2, velocity 0.8
 *
 * Hard switches make the thrust-direction (and therefore the ODE right-hand
 * side) discontinuous in the state, which breaks adaptive solvers: the RK45
 * error estimate is dominated by the jump and does not shrink with step size,
 * so the step-size controller chatters and never converges. The values are
 * preserved exactly, but each switch is now spread over a narrow transition
 * band (TRANSITION_HALF_WIDTH m on each side of the boundary) with a C2
 * smoothstep ramp, keeping the vector field continuous.
 */
const TRANSITION_HALF_WIDTH_M = 500;

interface BandTransition {
    boundaryAltM: number;
    fromPitch: number;
    toPitch: number;
}

const PITCH_TRANSITIONS: BandTransition[] = [
    { boundaryAltM: 1_000, fromPitch: 1.0, toPitch: 0.8 },
    { boundaryAltM: 20_000, fromPitch: 0.8, toPitch: 0.5 },
    { boundaryAltM: 50_000, fromPitch: 0.5, toPitch: 0.2 },
];

function smoothPitchWeight(altitude: number): number {
    let w = PITCH_TRANSITIONS[0].fromPitch;
    for (const t of PITCH_TRANSITIONS) {
        const low = t.boundaryAltM - TRANSITION_HALF_WIDTH_M;
        const width = 2 * TRANSITION_HALF_WIDTH_M;
        w += (t.toPitch - t.fromPitch) * smoothstep5((altitude - low) / width);
    }
    return w;
}

export function guidanceComputer(
    state: GuidanceState,
    mission: MissionProfile = LEO_500KM
): Vector2 {
    const pitch = pitchProgram(state);
    const roll = rollProgram(state);
    const velocity = velocityTurn(state);
    const peg = pegGuidance(state, mission);
    const pitchWeight = smoothPitchWeight(state.altitude);
    const unpegWeight = 1 - peg.weight;
    const velocityWeight = (1 - pitchWeight) * unpegWeight;
    const blendedPitchWeight = pitchWeight * unpegWeight;
    const rollWeight = 0;
    const guidanceVectors: GuidanceVector[] = [
        {
            direction: pitch,
            weight: blendedPitchWeight
        },
        {
            direction: velocity,
            weight: velocityWeight
        },
        {
            direction: roll,
            weight: rollWeight
        },
        peg
    ];
    return guidanceMixer(guidanceVectors);
}