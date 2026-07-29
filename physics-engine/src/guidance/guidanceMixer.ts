import { Vector2 } from "../types";
import { GuidanceVector } from "./types";

function normalize(v: Vector2): Vector2 {
    const mag = Math.hypot(v.x, v.y);

    if (mag < 1e-8) {
        return {
            x: 0,
            y: 1
        };
    }

    return {
        x: v.x / mag,
        y: v.y / mag
    };
}

export function guidanceMixer(
    vectors: GuidanceVector[]
): Vector2 {

    let x = 0;
    let y = 0;
    let totalWeight = 0;

    for (const vec of vectors) {

        x += vec.direction.x * vec.weight;
        y += vec.direction.y * vec.weight;
        totalWeight += vec.weight;

    }

    if (totalWeight <= 0) {

        return {
            x: 0,
            y: 1
        };

    }

    return normalize({
        x: x / totalWeight,
        y: y / totalWeight
    });

}