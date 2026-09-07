import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'

const FLOW_SPEED = 0.52

const vertexShader = /* glsl */ `
  uniform float uInteraction;
  uniform vec2 uPointer;
  uniform vec2 uRestFocus;
  varying vec2 vUv;
  varying float vFacing;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float followDistance = (vUv.x - 0.6) / 0.19;
    float followWindow = exp(-followDistance * followDistance);
    transformed.xy += (uPointer - uRestFocus) * followWindow * uInteraction;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 viewDirection = normalize(cameraPosition - worldPosition.xyz);
    vFacing = pow(1.0 - abs(dot(worldNormal, viewDirection)), 1.5);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFacing;

  void main() {
    float phase = (vUv.x * 8.0 - uTime * (0.72 + uSeed * 0.045) + uSeed) * 6.28318;
    float carrier = sin(phase) * 0.5 + 0.5;
    float secondaryCarrier = sin(phase * 0.47 - 1.7) * 0.5 + 0.5;
    float packet = smoothstep(0.38, 0.94, carrier);
    float secondaryPacket = smoothstep(0.58, 0.96, secondaryCarrier);
    float crossSection = max(sin(vUv.y * 3.14159), 0.0);
    float halo = pow(crossSection, 0.62);
    float core = pow(crossSection, 7.5);
    float endFade = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
    float strandVariation = 0.88 + sin(uSeed * 11.3) * 0.12;
    float energy = 1.0 + packet * 0.76 + secondaryPacket * 0.22;
    vec3 hotCore = mix(uColor, vec3(0.96, 0.99, 1.0), 0.78);
    vec3 color =
      uColor * halo * energy * strandVariation +
      hotCore * core * (1.85 + packet * 1.7);
    float alpha = endFade * (
      halo * (0.08 + packet * 0.16) +
      core * 0.72 +
      vFacing * 0.08
    );
    gl_FragColor = vec4(color, alpha);
  }
`

interface StrandDefinition {
  curve: THREE.CatmullRomCurve3
  color: THREE.Color
  radius: number
  restFocus: THREE.Vector2
  seed: number
}

function makeStrands() {
  const colors = ['#83c7ff', '#cbe9ff', '#ffffff', '#6bb6f4', '#a9d7ff']

  return Array.from({ length: 58 }, (_, index): StrandDefinition => {
    const normalized = index / 57
    const offset = (normalized - 0.5) * 2
    const jitter = Math.sin(index * 12.713) * 0.11
    const depth = -0.45 + Math.sin(index * 4.19) * 0.42
    const drift = Math.cos(index * 2.77) * 0.13
    const points = [
      new THREE.Vector3(-6.5, -2.22 + offset * 0.68, depth),
      new THREE.Vector3(-4.2, -2.28 + offset * 0.76 + jitter, depth + 0.05),
      new THREE.Vector3(-2.25, -1.74 + offset * 0.62 - jitter, depth + 0.12),
      new THREE.Vector3(-0.62, -1.02 + offset * 0.42 + drift, depth + 0.16),
      new THREE.Vector3(0.45, -0.35 + offset * 0.29, depth + 0.11),
      new THREE.Vector3(0.72, 0.57 + offset * 0.27 - jitter, depth),
      new THREE.Vector3(1.72, 1.22 + offset * 0.38, depth - 0.04),
      new THREE.Vector3(3.55, 1.08 + offset * 0.56 + drift, depth - 0.08),
      new THREE.Vector3(5.9, 1.72 + offset * 0.67, depth - 0.12),
    ]

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
    const focus = curve.getPointAt(0.6)
    return {
      curve,
      color: new THREE.Color(colors[index % colors.length]),
      radius: index % 9 === 0 ? 0.016 : index % 4 === 0 ? 0.009 : 0.0065,
      restFocus: new THREE.Vector2(focus.x, focus.y),
      seed: normalized * 4.7 + (index % 5) * 0.31,
    }
  })
}

interface FlowStrandProps extends StrandDefinition {
  index: number
  interaction: RefObject<FlowInteraction>
}

interface FlowInteraction {
  point: THREE.Vector2
  strength: number
}

function FlowStrand({
  curve,
  color,
  radius,
  restFocus,
  seed,
  index,
  interaction,
}: FlowStrandProps) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const animationTime = useRef(0)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: seed },
      uColor: { value: color },
      uInteraction: { value: 0 },
      uPointer: { value: new THREE.Vector2(1.35, -0.16) },
      uRestFocus: { value: restFocus },
    }),
    [color, restFocus, seed],
  )

  useFrame((_, delta) => {
    if (!material.current) return
    animationTime.current += Math.min(delta, 1 / 30) * FLOW_SPEED
    material.current.uniforms.uTime.value = animationTime.current
    material.current.uniforms.uPointer.value.copy(interaction.current.point)
    material.current.uniforms.uInteraction.value = interaction.current.strength
  })

  return (
    <mesh renderOrder={index % 3}>
      <tubeGeometry args={[curve, 112, radius, radius > 0.01 ? 7 : 5, false]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

export function FlowField({
  hasInteracted,
}: {
  hasInteracted: RefObject<boolean>
}) {
  const group = useRef<THREE.Group>(null)
  const interaction = useRef<FlowInteraction>({
    point: new THREE.Vector2(1.35, -0.16),
    strength: 0,
  })
  const interactionPlane = useRef(new THREE.Plane())
  const pointerRay = useRef(new THREE.Raycaster())
  const planeNormal = useRef(new THREE.Vector3())
  const planeOrigin = useRef(new THREE.Vector3())
  const planeRotation = useRef(new THREE.Quaternion())
  const worldIntersection = useRef(new THREE.Vector3())
  const localIntersection = useRef(new THREE.Vector3())
  const boundedTarget = useRef(new THREE.Vector2(1.35, -0.16))
  const centerOffset = useRef(new THREE.Vector2())
  const strands = useMemo(() => makeStrands(), [])

  useFrame(({ camera, pointer }, delta) => {
    if (!group.current) return
    const frameDelta = Math.min(delta, 1 / 30)

    group.current.updateWorldMatrix(true, false)
    group.current.getWorldPosition(planeOrigin.current)
    group.current.getWorldQuaternion(planeRotation.current)
    planeNormal.current.set(0, 0, 1).applyQuaternion(planeRotation.current)
    interactionPlane.current.setFromNormalAndCoplanarPoint(
      planeNormal.current,
      planeOrigin.current,
    )

    pointerRay.current.setFromCamera(pointer, camera)
    const hit = pointerRay.current.ray.intersectPlane(
      interactionPlane.current,
      worldIntersection.current,
    )

    if (hit && hasInteracted.current) {
      localIntersection.current.copy(hit)
      group.current.worldToLocal(localIntersection.current)
      boundedTarget.current.set(
        localIntersection.current.x,
        localIntersection.current.y,
      )
      centerOffset.current.set(
        boundedTarget.current.x - 1.35,
        boundedTarget.current.y + 0.16,
      )

      const targetRadius = centerOffset.current.length()
      if (targetRadius > 1.28) {
        centerOffset.current.multiplyScalar(1.28 / targetRadius)
        boundedTarget.current.set(
          1.35 + centerOffset.current.x,
          -0.16 + centerOffset.current.y,
        )
      }

      interaction.current.point.lerp(
        boundedTarget.current,
        1 - Math.exp(-3.4 * frameDelta),
      )
    }

    interaction.current.strength = THREE.MathUtils.damp(
      interaction.current.strength,
      hasInteracted.current ? 1 : 0,
      2.8,
      frameDelta,
    )
  })

  return (
    <group ref={group} rotation={[0.02, -0.04, -0.025]}>
      {strands.map((strand, index) => (
        <FlowStrand
          key={index}
          {...strand}
          index={index}
          interaction={interaction}
        />
      ))}
    </group>
  )
}
