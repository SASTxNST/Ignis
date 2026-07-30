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