import { WindModel } from "./windModel";
import { WindState } from "../types";

export class ConstantWindModel implements WindModel {

    constructor(

        private readonly speed: number,

        private readonly directionDeg: number,

    ) {}

    getWind(): WindState {

        const theta = this.directionDeg * Math.PI / 180;

        return {

            velocity: {

                x: this.speed * Math.cos(theta),

                y: this.speed * Math.sin(theta),

            },

            speed: this.speed,

            directionDeg: this.directionDeg,

        };

    }

}