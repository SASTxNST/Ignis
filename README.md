# Ignis

Ignis is an interactive rocket launch simulation platform built to let users design, test, and launch virtual rockets through realistic mission scenarios. The platform focuses on propulsion physics, launch dynamics, trajectory control, and mission planning in an engaging digital environment.

Users can experiment with rocket configurations, simulate launches, optimize flight paths, and explore aerospace concepts through hands-on learning and engineering-driven gameplay.

## Core Features

- Rocket launch simulation with realistic mechanics
- Propulsion, thrust, and stage behavior testing
- Flight trajectory and altitude analysis
- Mission planning and launch sequence control
- Sandbox mode for experimentation
- Educational aerospace learning experience
- Interactive dashboards and telemetry data
- Future-ready multiplayer challenges and competitions

## Vision

Ignis aims to make rocket science accessible, exciting, and interactive for students, enthusiasts, developers, and future aerospace innovators.

## Meaning of Ignis

**Ignis** is derived from the Latin word for **fire** — representing ignition, energy, propulsion, and the spark that powers every launch.

## Guidance Architecture

### Pitch Program

A rocket's pitch program (often paired with a roll program) is a pre-programmed flight computer command sequence that tilts a rocket away from a purely vertical liftoff into a curved, horizontal trajectory needed to reach orbital velocity

```text
                Target Orbit
                      │
                      ▼
              Guidance Manager
                      │
      ┌───────────────┼────────────────┐
      │               │                │
      ▼               ▼                ▼
    Pitch & Roll    PEG            Velocity Turn
    Program         Program        Program
      │               │                │
  θ_pitch_cmd         |           θ_velocity_cmd
  φ_roll_cmd          |
      │               │                │
      └───────────────┬────────────────┘
                      ▼
            Guidance Command Mixer
                      │
              Desired Attitude
                      │
                      ▼
          Attitude Controller (PID)
                      │
                      ▼
       Gimbal / RCS / Control Surfaces
                      │
                      ▼
                Physics Engine

```

### Powered Explicit Guidance (PEG)

PEG is a technique for guiding rockets to their target orbits. It's called "Powered Explicit" because it models thrust acceleration (T / m) explicitly and solves for a thrust/steering profile needed to reach the target state.
