import { GuidanceState } from "./types";
import { Vector2 } from "../types";

function degToRad(deg: number): number {
    return deg * Math.PI / 180;
}

export function pitchProgram(state: GuidanceState): Vector2 {

    let pitchDeg = 90;

    if (state.time < 10) {

        pitchDeg = 90;

    } else if (state.time < 120) {

        const t = (state.time - 10) / 110;

        pitchDeg = 90 - 45 * t;

    } else {

        pitchDeg = 45;

    }

    const theta = degToRad(pitchDeg);

    return {

        x: Math.cos(theta),

        y: Math.sin(theta)

    };

}