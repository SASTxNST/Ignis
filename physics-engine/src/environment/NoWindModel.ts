import { WindModel } from "./windModel";
import { WindState } from "../types";

export class NoWindModel implements WindModel {

    getWind(): WindState {

        return {
            velocity: {
                x: 0,
                y: 0,
            },
            speed: 0,
            directionDeg: 0,
        };

    }

}