import React, { useRef } from 'react';
import { StyleSheet, View, PanResponder } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { loadAsync } from 'expo-three';
import * as THREE from 'three';
import { EARTH_TEXTURE } from '../assets/earthTexture';
import { AIRPORTS } from '../data/airports';
import { getAllFlights } from '../data/db';

const GLOBE_R       = 1;
const CAM_DEFAULT_Z = 2.8;
const CAM_MIN_Z     = 1.4;
const CAM_MAX_Z     = 5.5;

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function arcColor(count: number, min: number, max: number): THREE.Color {
  const t = max > min ? (count - min) / (max - min) : 0;
  //r=1 g=0 b lerps 0 to 1 giving red to magenta
  return new THREE.Color(1, 0, t);
}

async function tryLoadEarthTexture(): Promise<THREE.Texture | null> {
  if (!EARTH_TEXTURE) return null;
  try {
    return (await loadAsync(EARTH_TEXTURE)) as THREE.Texture;
  } catch {
    return null;
  }
}

export function Globe() {
  const groupRef  = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const autoRotate    = useRef(true);
  const lastPos       = useRef({ x: 0, y: 0 });
  const isPinching    = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartZ   = useRef(CAM_DEFAULT_Z);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (e) => {
        autoRotate.current = false;
        const t = e.nativeEvent.touches;
        if (t.length === 1) {
          lastPos.current = { x: t[0].pageX, y: t[0].pageY };
        }
      },

      onPanResponderMove: (e) => {
        const t = e.nativeEvent.touches;

        if (t.length >= 2) {
          //pinch zoom
          const dx   = t[0].pageX - t[1].pageX;
          const dy   = t[0].pageY - t[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (!isPinching.current) {
            isPinching.current    = true;
            pinchStartDist.current = dist;
            pinchStartZ.current   = cameraRef.current?.position.z ?? CAM_DEFAULT_Z;
          } else if (cameraRef.current && pinchStartDist.current > 0) {
            const scale = pinchStartDist.current / dist;
            cameraRef.current.position.z = Math.max(
              CAM_MIN_Z, Math.min(CAM_MAX_Z, pinchStartZ.current * scale),
            );
          }
        } else if (t.length === 1) {
          //single finger rotate
          if (isPinching.current) {
            //reset reference on pinch to drag transition
            isPinching.current = false;
            lastPos.current = { x: t[0].pageX, y: t[0].pageY };
            return;
          }
          const dx = t[0].pageX - lastPos.current.x;
          const dy = t[0].pageY - lastPos.current.y;
          lastPos.current = { x: t[0].pageX, y: t[0].pageY };
          const g = groupRef.current;
          if (!g) return;
          g.rotation.y += dx * 0.005;
          g.rotation.x = Math.max(-1.2, Math.min(1.2, g.rotation.x + dy * 0.005));
        }
      },

      onPanResponderRelease: () => {
        isPinching.current = false;
        setTimeout(() => { autoRotate.current = true; }, 2000);
      },
    }),
  ).current;

  //gl context setup
  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width: W, height: H, style: {},
        addEventListener: () => {}, removeEventListener: () => {},
        clientWidth: W, clientHeight: H,
      } as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGL2RenderingContext,
      antialias: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x050a18, 1);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.z = CAM_DEFAULT_Z;
    cameraRef.current = camera;

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    //earth sphere
    const earthTexture = await tryLoadEarthTexture();
    const earthMat = earthTexture
      ? new THREE.MeshPhongMaterial({ map: earthTexture, shininess: 25, specular: 0x111111 })
      : new THREE.MeshPhongMaterial({ color: 0x1a3a6e,  shininess: 60, specular: 0x334477 });

    group.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 64, 64), earthMat));

    //lat lon grid overlay
    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R + 0.002, 36, 18),
        new THREE.MeshBasicMaterial({
          color: 0x3366cc, wireframe: true, transparent: true, opacity: earthTexture ? 0.04 : 0.08,
        }),
      ),
    );

    //atmosphere fixed does not rotate with globe
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R * 1.08, 64, 64),
        new THREE.MeshPhongMaterial({ color: 0x4499dd, transparent: true, opacity: 0.06 }),
      ),
    );

    //stars
    const starVerts: number[] = [];
    while (starVerts.length < 1800 * 3) {
      const x = THREE.MathUtils.randFloatSpread(120);
      const y = THREE.MathUtils.randFloatSpread(120);
      const z = THREE.MathUtils.randFloatSpread(120);
      if (x * x + y * y + z * z > 100) { //skip stars within 10 units of origin
        starVerts.push(x, y, z);
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 })));

    //lights
    scene.add(new THREE.AmbientLight(0x334466, 0.9));
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.6);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    //find airports used in flights
    const flights = getAllFlights();
    const usedAirports = new Set<string>();
    flights.forEach(({ from, to }) => {
      usedAirports.add(from);
      usedAirports.add(to);
    });

    //airport dots
    const dotGeo = new THREE.SphereGeometry(0.005, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
    usedAirports.forEach((code) => {
      const ap = AIRPORTS[code];
      if (!ap) return;
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(latLonToVec3(ap.lat, ap.lon, GLOBE_R + 0.012));
      group.add(dot);
    });

    //count how many times each route appears
    const routeCount = new Map<string, number>();
    flights.forEach(({ from, to }) => {
      const key = [from, to].sort().join('|');
      routeCount.set(key, (routeCount.get(key) ?? 0) + 1);
    });

    //arc lines
    const counts = Array.from(routeCount.values());
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    routeCount.forEach((count, key) => {
      const [codeA, codeB] = key.split('|');
      const a1 = AIRPORTS[codeA];
      const a2 = AIRPORTS[codeB];
      if (!a1 || !a2) return;

      const v1  = latLonToVec3(a1.lat, a1.lon, GLOBE_R + 0.012);
      const v2  = latLonToVec3(a2.lat, a2.lon, GLOBE_R + 0.012);
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(GLOBE_R + v1.distanceTo(v2) * 0.35);

      const pts = new THREE.QuadraticBezierCurve3(v1, mid, v2).getPoints(80);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: arcColor(count, minCount, maxCount) })));
    });

    //render loop
    const render = () => {
      requestAnimationFrame(render);
      if (autoRotate.current) group.rotation.y += 0.0006;
      renderer.render(scene, camera);
      (gl as any).endFrameEXP();
    };
    render();
  };

  return (
    <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}
