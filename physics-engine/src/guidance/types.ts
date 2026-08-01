import { Vector2 } from "../types";

export interface GuidanceState {
    time: number;

    position: Vector2;

    altitude: number;

    velocity: Vector2;

    mass: number;

    stageIndex: number;
}

export interface GuidanceVector {
    direction: Vector2;

    weight: number;
}

export interface GuidanceCommand {
    thrustDirection: Vector2;
}

export interface PEGMission {

    targetApogeeM: number;

    targetPerigeeM: number;

    targetInclinationDeg: number;

}

export interface OrbitEstimate {

    radius: number;

    velocity: number;

    circularVelocity: number;

    escapeVelocity: number;

    specificEnergy: number;

    remainingDeltaV: number;

}