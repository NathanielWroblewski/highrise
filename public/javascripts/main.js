import Vector from './models/vector.js'
import FourByFour from './models/four_by_four.js'
import Camera from './models/orthographic.js'
import angles from './isomorphisms/angles.js'
import renderLine from './views/line.js'
import renderCircle from './views/circle.js'
import renderPolygon from './views/polygon.js'
import { seed, noise } from './utilities/noise.js'
import { remap, grid, stableSort } from './utilities/index.js'
import {
  BACKGROUND, WATER, DOT, COLORS, ROAD, STREET_LAMP, BLACK, LIGHT_ON, LIGHT_OFF
} from './constants/colors.js'
import {
  ZOOM, FPS, TIME_THRESHOLD, Δt, Δθ, FREQUENCY, AMPLITUDE, CUBE_FACES, ROAD_MODULO
} from './constants/dimensions.js'

// Copyright (c) 2020 Nathaniel Wroblewski
// I am making my contributions/submissions to this project solely in my personal
// capacity and am not conveying any rights to any intellectual property of any
// third parties.

const canvas = document.querySelector('.canvas')
const context = canvas.getContext('2d')

const perspective = FourByFour.identity()
  .rotX(angles.toRadians(45))
  .rotY(angles.toRadians(30))

const camera = new Camera({
  position: Vector.zeroes(),
  direction: Vector.zeroes(),
  up: Vector.from([0, 1, 0]),
  width: canvas.width,
  height: canvas.height,
  zoom: ZOOM
})

const from = Vector.from([-10, -10])
const to = Vector.from([10, 10])
const by = Vector.from([2, 2])

const CUBE_VERTICES = [
  Vector.from([ 1,  1,  1]),
  Vector.from([-1,  1,  1]),
  Vector.from([ 1, -1,  1]),
  Vector.from([-1, -1,  1]),
  Vector.from([ 1,  1, -1]),
  Vector.from([-1,  1, -1]),
  Vector.from([ 1, -1, -1]),
  Vector.from([-1, -1, -1]),
]

seed(Math.random())

const points = grid({ from, to, by }, ([x, z]) => Vector.from([x, 1, z]))
const cubes = points.map(point => ({
  type: 'cube',
  vertices: CUBE_VERTICES.map(vertex => point.add(vertex)),
  center: point
}))
const faces = []

cubes.forEach(cube => {
  CUBE_FACES.forEach((face, index) => {
    let vertices = face.map(index => cube.vertices[index])
    let center = vertices[0].magnitude > vertices[2].magitude ?
      vertices[0].subtract(vertices[2]).divide(2).add(vertices[2]) : vertices[2].subtract(vertices[0]).divide(2).add(vertices[0])
    let normal = vertices[1].subtract(vertices[0]).cross(vertices[2].subtract(vertices[1])).normalize()
    let top = cube.center.add(Vector.from([0, 1, 0]))

    faces.push({
      type: 'polygon',
      vertices,
      center,
      top,
      normal
    })

    if (index === (CUBE_FACES.length - 1) && Math.random() < 0.3) {
      vertices = [
        cube.vertices[face[0]],
        cube.vertices[face[1]],
        cube.vertices[face[1]].subtract(cube.vertices[face[2]]).divide(2).add(cube.vertices[face[2]]).add(Vector.from([0, 1, 0])),
        cube.vertices[face[0]].subtract(cube.vertices[face[3]]).divide(2).add(cube.vertices[face[3]]).add(Vector.from([0, 1, 0])),
      ]
      center = vertices[0].magnitude > vertices[2].magitude ?
        vertices[0].subtract(vertices[2]).divide(2).add(vertices[2]) : vertices[2].subtract(vertices[0]).divide(2).add(vertices[0])
      normal = vertices[1].subtract(vertices[0]).cross(vertices[2].subtract(vertices[1])).normalize().multiply(-1)
      top = cube.center.add(Vector.from([0, 1, 0]))

      faces.push({
        type: 'polygon',
        vertices,
        center: center.subtract(Vector.from([0, 0.5, 0])),
        top,
        normal
      })

      vertices = [
        cube.vertices[face[3]],
        cube.vertices[face[2]],
        cube.vertices[face[1]].subtract(cube.vertices[face[2]]).divide(2).add(cube.vertices[face[2]]).add(Vector.from([0, 1, 0])),
        cube.vertices[face[0]].subtract(cube.vertices[face[3]]).divide(2).add(cube.vertices[face[3]]).add(Vector.from([0, 1, 0])),
      ]
      center = vertices[0].magnitude > vertices[2].magitude ?
        vertices[0].subtract(vertices[2]).divide(2).add(vertices[2]) : vertices[2].subtract(vertices[0]).divide(2).add(vertices[0])
      normal = vertices[1].subtract(vertices[0]).cross(vertices[2].subtract(vertices[1])).normalize()
      top = cube.center.add(Vector.from([0, 1, 0]))

      faces.push({
        type: 'polygon',
        vertices,
        center: center.subtract(Vector.from([0, 0.4, 0])), // for render-order sorting purposes
        top,
        normal
      })
    }
  })
})

const renderOrderComparator = (a, b, point) => {
  const a0 = point.subtract(a.center)
  const b0 = point.subtract(b.center)

  if (a0.x < b0.x) return -1
  if (a0.x > b0.x) return 1
  if (a0.y < b0.y) return 1
  if (a0.y > b0.y) return -1
  if (a0.z < b0.z) return 1
  if (a0.z > b0.z) return -1

  return 0
}

const onOrOff = ([x, y, z], time) => {
  const distortion = noise((x + z) * 0.06, y * 0.06, time * 0.06)

  return distortion > 0 ? LIGHT_ON : LIGHT_OFF
}

const campos = Vector.from([0, 100, 100])
const light = Vector.from([0, 100, -100])

const render = () => {
  context.clearRect(0, 0, canvas.width, canvas.height)

  const renderOrder = stableSort(faces, (a, b) => renderOrderComparator(a, b, campos))

  renderOrder.forEach(face => {
    const distortion = Math.abs(noise((face.top.x + face.top.z + face.top.y) * 0.08, face.top.y * 0.08, time * 0.08)) * 8
    const projected = face.vertices.map(vertex => {
      const point = vertex.y > 0 ?
        vertex.add(Vector.from([0, distortion, 0])) : vertex

      return camera.project(point.transform(perspective))
    })

    if (face.top.x % ROAD_MODULO === 0 || face.top.z % ROAD_MODULO === 0) {
      if (face.vertices.every(pt => pt.y === 0)) {
        renderPolygon(context, projected, ROAD, ROAD)

        if (face.top.x % 4 === 0 && face.top.z % 4 !== 0) {
          const bulb = camera.project(face.vertices[2].add(Vector.from([-0.5, 1, 0])).transform(perspective))
          const posts = [
            camera.project(face.vertices[2].add(Vector.from([-0.5, 1.25, 0])).transform(perspective)),
            camera.project(face.vertices[2].add(Vector.from([0, 1.25, 0])).transform(perspective)),
            camera.project(face.vertices[2].add(Vector.from([0, 0, 0])).transform(perspective)),
          ]

          context.filter = 'blur(4px)'
          renderCircle(context, bulb, 4, LIGHT_ON, LIGHT_ON)
          context.filter = 'none'
          renderCircle(context, bulb, 1, LIGHT_ON, LIGHT_ON)
          renderLine(context, bulb, posts[0], STREET_LAMP, 3)
          renderLine(context, posts[0], posts[1], STREET_LAMP, 3)
          renderLine(context, posts[1], posts[2], STREET_LAMP, 3)
        }
      }
    } else {
      const ray = light.subtract(face.vertices[1]).normalize()
      const facingRatio = face.normal.dot(ray)
      const colorIndex = Math.floor(remap(facingRatio, [-0.0013, 0.0013], [0, COLORS.length - 1]))
      const color = COLORS[colorIndex]

      renderPolygon(context, projected, color, color)

      if (face.vertices.every(vertex => vertex.x === face.vertices[0].x) && face.top.x > face.vertices[0].x) {
        for (let y0 = Math.floor(face.top.y + distortion); y0 >= 2; y0--) {
          const y = y0 - 1

          for (let i = 0; i < 6; i++) {
            const pane = [
              face.vertices[1].add(Vector.from([0, 1/3 + y, -i/3])),
              face.vertices[1].add(Vector.from([0, 1/3 + y, -(i+1)/3])),
              face.vertices[1].add(Vector.from([0, 2/3 + y, -(i+1)/3])),
              face.vertices[1].add(Vector.from([0, 2/3 + y, -i/3])),
            ].map(point => camera.project(point.transform(perspective)))
            const color = onOrOff(pane[0], time)

            renderPolygon(context, pane, BLACK, color)
          }
        }
      }

      if (face.vertices.every(vertex => vertex.z === face.vertices[0].z) && face.top.z < face.vertices[0].z) {
        for (let y0 = Math.floor(face.top.y + distortion); y0 >= 2; y0--) {
          const y = y0 - 1

          for (let i = 0; i < 6; i++) {
            const pane = [
              face.vertices[2].add(Vector.from([i/3, 1/3 + y, 0])),
              face.vertices[2].add(Vector.from([(i+1)/3, 1/3 + y, 0])),
              face.vertices[2].add(Vector.from([(i+1)/3, 2/3 + y, 0])),
              face.vertices[2].add(Vector.from([i/3, 2/3 + y, 0])),
            ].map(point => camera.project(point.transform(perspective)))
            const color = onOrOff(pane[0], time)

            renderPolygon(context, pane, BLACK, color)
          }
        }
      }
    }
  })

  if (time > TIME_THRESHOLD) time = 0
  time += Δt
}

let time = 0
let prevTick = 0

const step = () => {
  window.requestAnimationFrame(step)

  const now = Math.round(FPS * Date.now() / 1000)
  if (now === prevTick) return
  prevTick = now

  render()
}

seed(Math.random())

step()
