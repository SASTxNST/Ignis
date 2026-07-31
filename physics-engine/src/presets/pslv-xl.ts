import { RocketConfig } from "../types";

export const PSLV_XL: RocketConfig = {
    id: "pslvxl",

    name: "PSLV-XL",

    description: "Polar Satellite Launch Vehicle XL",

    payloadMassKg: 1750,

    gravityTurnStartAltitudeM: 1200,

    dragCoefficient: 0.31,

    crossSectionalAreaM2: 6.16,

    stages: [
        {
            name: "PS1 + 6 XL Strap-ons",

            propulsionType: "solid",

            thrustKN: 7200,

            ispSeconds: 269,

            dryMassKg: 31000,

            propellantMassKg: 211000
        },

        {
            name: "PS2",

            propulsionType: "liquid",

            thrustKN: 799,

            ispSeconds: 293,

            dryMassKg: 5300,

            propellantMassKg: 41000
        },

        {
            name: "PS3",

            propulsionType: "solid",

            thrustKN: 240,

            ispSeconds: 295,

            dryMassKg: 1300,

            propellantMassKg: 7600
        },

        {
            name: "PS4",

            propulsionType: "liquid",

            thrustKN: 14.6,

            ispSeconds: 308,

            dryMassKg: 920,

            propellantMassKg: 2500
        }
    ]
};