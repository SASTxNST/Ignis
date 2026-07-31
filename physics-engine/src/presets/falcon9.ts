import { RocketConfig } from "../types";

export const FALCON_9: RocketConfig = {
    id: "falcon9",

    name: "Falcon 9 Block 5",

    payloadMassKg: 22800,

    gravityTurnStartAltitudeM: 1500,

    dragCoefficient: 0.3,

    crossSectionalAreaM2: 10.75,

    stages: [
        {
            name: "Stage 1",
            propulsionType: "liquid",
            thrustKN: 7607,
            ispSeconds: 282,
            dryMassKg: 25600,
            propellantMassKg: 411000
        },
        {
            name: "Stage 2",
            propulsionType: "liquid",
            thrustKN: 981,
            ispSeconds: 348,
            dryMassKg: 4000,
            propellantMassKg: 92670
        }
    ]
};