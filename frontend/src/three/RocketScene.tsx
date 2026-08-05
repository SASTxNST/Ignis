import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RocketState } from "@ignis/physics-engine";

interface RocketSceneProps {
  telemetry: RocketState[];
  frameIndex: number;
}



const WORLD_SCALE = 1 / 500; // 500 world-meters per simulated meter of altitude

export default function RocketScene({ telemetry, frameIndex }: RocketSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rocketRef = useRef<THREE.Group | null>(null);
  const trailPointsRef = useRef<THREE.Vector3[]>([]);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);


  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e14);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100_000
    );
    camera.position.set(150, 80, 250);
    camera.lookAt(0, 50, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(200, 400, 100);
    scene.add(ambient, sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshStandardMaterial({ color: 0x1a2233 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const rocket = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 12, 16),
      new THREE.MeshStandardMaterial({ color: 0xd9d9d9 })
    );
    body.position.y = 6;
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(2, 5, 16),
      new THREE.MeshStandardMaterial({ color: 0xff5a36 })
    );
    nose.position.y = 14.5;
    rocket.add(body, nose);
    scene.add(rocket);
    rocketRef.current = rocket;

    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0xffa07a });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    let animationFrameId: number;
    const renderLoop = () => {
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  
  useEffect(() => {
    trailPointsRef.current = [];
  }, [telemetry]);


  useEffect(() => {
    const frame = telemetry[frameIndex];
    const rocket = rocketRef.current;
    const trailLine = trailLineRef.current;
    if (!frame || !rocket || !trailLine) return;

    const worldX = frame.position.x * WORLD_SCALE;
    const worldY = frame.position.y * WORLD_SCALE;
    rocket.position.set(worldX, worldY, 0);

  
    const angle = Math.atan2(frame.velocity.x, frame.velocity.y || 1e-6);
    rocket.rotation.z = -angle;

    trailPointsRef.current.push(new THREE.Vector3(worldX, worldY, 0));
    trailLine.geometry.setFromPoints(trailPointsRef.current);
  }, [telemetry, frameIndex]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
