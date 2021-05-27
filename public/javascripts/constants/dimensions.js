// Copyright (c) 2020 Nathaniel Wroblewski
// I am making my contributions/submissions to this project solely in my personal
// capacity and am not conveying any rights to any intellectual property of any
// third parties.

export const τ = 2 * Math.PI

export const ZOOM = 0.06
export const FPS = 60

export const FREQUENCY = 0.1
export const AMPLITUDE = 4

export const Δt = 0.2
export const TIME_THRESHOLD = 1000000

export const CUBE_FACES = [
  [0, 1, 3, 2], // back left
  [1, 3, 7, 5], // back right
  [2, 6, 4, 0], // front left
  [6, 7, 5, 4], // front right
  [3, 2, 6, 7], // bottom
  [0, 1, 5, 4], // top
]

export const Δθ = 0.1

export const ROAD_MODULO = 8
