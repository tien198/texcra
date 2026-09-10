import { Environment, Lightformer } from '@react-three/drei'

export function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.28} color="#c6def5" />
      <directionalLight position={[4, 5, 7]} intensity={2.2} color="#f5fbff" />
      <Environment resolution={256}>
        <group rotation={[0, 0.15, 0]}>
          <Lightformer
            intensity={4.5}
            color="#e9f4ff"
            position={[-4, 3, 2]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[7, 1.1, 1]}
          />
          <Lightformer
            intensity={7}
            color="#ffffff"
            position={[4, 1, 3]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[4, 0.35, 1]}
          />
          <Lightformer
            intensity={3.5}
            color="#398ed1"
            position={[0, -4, 1]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[7, 2, 1]}
          />
          <Lightformer
            form="ring"
            intensity={3}
            color="#bfdfff"
            position={[0, 0, -4]}
            scale={5}
          />
        </group>
      </Environment>
    </>
  )
}
