import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import styles from "./VisualScene.module.css";
import { ChromeRing } from "./ChromeRing";
import { FlowField } from "./FlowField";
import { TechnicalGrid } from "./TechnicalGrid";

function StudioEnvironment() {
  return (
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
  );
}

function SceneContent() {
  const { viewport } = useThree();
  const compact = viewport.width < 8;

  return (
    <>
      <ambientLight intensity={0.28} color="#c6def5" />
      <directionalLight position={[4, 5, 7]} intensity={2.2} color="#f5fbff" />
      <group
        scale={compact ? 0.78 : 1}
        position={compact ? [0.65, -0.45, 0] : [0.45, -0.06, 0]}
      >
        <TechnicalGrid />
        <FlowField />
        <ChromeRing />
      </group>
      <StudioEnvironment />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.68}
          luminanceSmoothing={0.5}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.64} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export function VisualScene() {
  return (
    <div className={styles.visualScene} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 36, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
