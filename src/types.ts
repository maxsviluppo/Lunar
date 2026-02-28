export type VehicleType = 'UFO' | 'SHUTTLE' | 'BALLOON' | 'ROVER';

export interface GameState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  fuel: number;
  isLanded: boolean;
  isCrashed: boolean;
  impactVelocity: number;
  thrusting: boolean;
  leftThrusting: boolean;
  rightThrusting: boolean;
  zoom: number;
}

export interface VehicleConfig {
  name: string;
  gravity: number;
  thrust: number;
  lateralThrust: number;
  fuelCapacity: number;
  fuelConsumption: number;
  drag: number;
  safeLandingSpeed: number;
  width: number;
  height: number;
}

export const VEHICLE_CONFIGS: Record<VehicleType, VehicleConfig> = {
  UFO: {
    name: 'UFO',
    gravity: 0.01,
    thrust: 0.04,
    lateralThrust: 0.04,
    fuelCapacity: 100,
    fuelConsumption: 0.1,
    drag: 0.995,
    safeLandingSpeed: 1.2,
    width: 30,
    height: 15,
  },
  SHUTTLE: {
    name: 'Space Shuttle',
    gravity: 0.015,
    thrust: 0.045,
    lateralThrust: 0.03,
    fuelCapacity: 150,
    fuelConsumption: 0.15,
    drag: 0.99,
    safeLandingSpeed: 1.0,
    width: 20,
    height: 40,
  },
  BALLOON: {
    name: 'Hot Air Balloon',
    gravity: 0.005,
    thrust: 0.02,
    lateralThrust: 0.02,
    fuelCapacity: 200,
    fuelConsumption: 0.05,
    drag: 0.98,
    safeLandingSpeed: 0.8,
    width: 25,
    height: 35,
  },
  ROVER: {
    name: 'Lunar Rover',
    gravity: 0.012,
    thrust: 0.035,
    lateralThrust: 0.05,
    fuelCapacity: 120,
    fuelConsumption: 0.08,
    drag: 0.992,
    safeLandingSpeed: 1.5,
    width: 35,
    height: 20,
  },
};
