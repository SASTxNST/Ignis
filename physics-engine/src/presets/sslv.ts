import { RocketConfig } from "../types";

export const SSLV: RocketConfig = {
    id: "sslv",

    name: "SSLV",

    description: "Small Satellite Launch Vehicle",

    payloadMassKg: 500,

    gravityTurnStartAltitudeM: 900,

    dragCoefficient: 0.33,

    crossSectionalAreaM2: 3.14,

    stages: [
        {
            name: "SS1",

            propulsionType: "solid",

            thrustKN: 2400,

            ispSeconds: 270,

            dryMassKg: 10000,

            propellantMassKg: 87000
        },

        {
            name: "SS2",

            propulsionType: "solid",

            thrustKN: 700,

            ispSeconds: 282,

            dryMassKg: 3000,

            propellantMassKg: 7700
        },

        {
            name: "SS3",

            propulsionType: "solid",

            thrustKN: 260,

            ispSeconds: 290,

            dryMassKg: 900,

            propellantMassKg: 4500
        },

        {
            name: "Velocity Trimming Module",

            propulsionType: "liquid",

            thrustKN: 2,

            ispSeconds: 315,

            dryMassKg: 250,

            propellantMassKg: 55
        }
    ]
};