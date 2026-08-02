import { getWind } from "../wind";

export function validateWindModel(): void {

    console.log("=== Wind Model Validation ===");

    const altitudes = [
        0,
        500,
        3000,
        8000,
        15000,
        30000,
    ];

    for (const h of altitudes) {

        const wind = getWind(h);

        console.log(
            h.toFixed(0).padStart(6),
            "m :",
            wind.speed.toFixed(2),
            "m/s",
            wind.directionDeg.toFixed(1),
            "deg",
            `(${wind.velocity.x.toFixed(2)}, ${wind.velocity.y.toFixed(2)})`
        );

    }

}