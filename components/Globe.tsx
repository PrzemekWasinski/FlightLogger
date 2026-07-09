import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, PanResponder } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import jpegjs from 'jpeg-js';
import { EARTH_JPEG_BASE64 } from '../assets/earthTextureBase64';
import { AIRPORTS } from '../data/airports';
import { getAllFlights } from '../data/db';

const GLOBE_R       = 1;
const CAM_DEFAULT_Z = 4.2;
const CAM_MIN_Z     = 1.4;
const CAM_MAX_Z     = 7.0;

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

const ARC_COLOR = new THREE.Color(0xf0b35a);

// Decodes earth.jpg in JS (jpeg-js) and uploads raw RGBA pixels via the standard
// gl.texImage2D TypedArray path. This bypasses expo-gl's native stbi_load extension
// Decodes the embedded JPEG (base64 in earthTextureBase64.ts) via jpeg-js and
// uploads raw RGBA pixels using the standard gl.texImage2D TypedArray path.
// Embedding the JPEG in the JS bundle sidesteps Android's raw-resource URI scheme
// (assets_earth) which is unreachable from fetch/FileSystem/expo-gl's stbi_load.
async function tryLoadEarthTexture(
  gl: ExpoWebGLRenderingContext,
  renderer: THREE.WebGLRenderer,
): Promise<THREE.Texture | null> {
  try {
    const binary  = atob(EARTH_JPEG_BASE64);
    const jpegBuf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) jpegBuf[i] = binary.charCodeAt(i);

    const { data: pixels, width, height } = jpegjs.decode(
      jpegBuf.buffer as ArrayBuffer,
      { useTArray: true },
    );

    // JPEG rows are top→bottom; raw glTexImage2D expects bottom→top. Flip in-place.
    const rowBytes = width * 4;
    const tmp = new Uint8Array(rowBytes);
    for (let y = 0; y < height >> 1; y++) {
      const top = pixels.subarray(y * rowBytes, (y + 1) * rowBytes);
      const bot = pixels.subarray((height - 1 - y) * rowBytes, (height - y) * rowBytes);
      tmp.set(top); top.set(bot); bot.set(tmp);
    }

    const glTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const texture = new THREE.Texture();
    texture.wrapS   = THREE.RepeatWrapping;
    texture.wrapT   = THREE.RepeatWrapping;
    texture.flipY   = false;
    const props = (renderer as any).properties.get(texture);
    props.__webglTexture = glTex;
    props.__webglInit    = true;

    return texture;
  } catch (e) {
    console.error('[Globe] texture load failed:', e);
    return null;
  }
}

interface GlobeProps {
  refreshKey?: number;
}

export function Globe({ refreshKey = 0 }: GlobeProps) {
  const groupRef    = useRef<THREE.Group | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const rebuildRef  = useRef<(() => void) | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    rebuildRef.current?.();
  }, [refreshKey]);

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
          if (isPinching.current) {
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
    renderer.setClearColor(0x07111f, 1);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.z = CAM_DEFAULT_Z;
    cameraRef.current = camera;

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    const earthTexture = await tryLoadEarthTexture(gl, renderer);
    const earthMat = earthTexture
      ? new THREE.MeshPhongMaterial({ map: earthTexture, shininess: 18, specular: 0x16202d })
      : new THREE.MeshPhongMaterial({ color: 0x19324b,  shininess: 55, specular: 0x4b6178 });

    group.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 64, 64), earthMat));

    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R + 0.002, 36, 18),
        new THREE.MeshBasicMaterial({
          color: 0xf0b35a, wireframe: true, transparent: true, opacity: earthTexture ? 0.035 : 0.08,
        }),
      ),
    );

    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(GLOBE_R * 1.08, 64, 64),
        new THREE.MeshPhongMaterial({ color: 0x65d0c2, transparent: true, opacity: 0.055 }),
      ),
    );

    const starVerts: number[] = [];
    while (starVerts.length < 1800 * 3) {
      const x = THREE.MathUtils.randFloatSpread(120);
      const y = THREE.MathUtils.randFloatSpread(120);
      const z = THREE.MathUtils.randFloatSpread(120);
      if (x * x + y * y + z * z > 100) {
        starVerts.push(x, y, z);
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd9e8ef, size: 0.12 })));

    scene.add(new THREE.AmbientLight(0x384b5d, 0.92));
    const sun = new THREE.DirectionalLight(0xffe2b3, 1.55);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    const routesGroup = new THREE.Group();
    group.add(routesGroup);

    function buildRoutes() {
      routesGroup.children.slice().forEach(c => {
        const obj = c as any;
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m: THREE.Material) => m.dispose());
        else obj.material?.dispose();
        routesGroup.remove(c);
      });

      const flights = getAllFlights();

      const usedAirports = new Set<string>();
      flights.forEach(({ from, to }) => { usedAirports.add(from); usedAirports.add(to); });
      const dotGeo = new THREE.SphereGeometry(0.005, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x65d0c2 });
      usedAirports.forEach(code => {
        const ap = AIRPORTS[code];
        if (!ap) return;
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(latLonToVec3(ap.lat, ap.lon, GLOBE_R + 0.006));
        routesGroup.add(dot);
      });

      const routeCount = new Map<string, number>();
      flights.forEach(({ from, to }) => {
        const key = [from, to].sort().join('|');
        routeCount.set(key, (routeCount.get(key) ?? 0) + 1);
      });

      if (!routeCount.size) return;

      routeCount.forEach((_count, key) => {
        const [codeA, codeB] = key.split('|');
        const a1 = AIRPORTS[codeA];
        const a2 = AIRPORTS[codeB];
        if (!a1 || !a2) return;

        const v1   = latLonToVec3(a1.lat, a1.lon, 1);
        const v2   = latLonToVec3(a2.lat, a2.lon, 1);
        const axis = new THREE.Vector3().crossVectors(v1, v2);
        if (axis.lengthSq() < 1e-8) return; // skip same-point or antipodal
        axis.normalize();

        const angle     = v1.angleTo(v2);
        // sqrt compresses the range: short routes ~0.015, transatlantic ~0.07, ultra-long ~0.12
        const arcHeight = Math.min(0.18, 0.07 * Math.sqrt(angle));
        const N         = 80;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= N; i++) {
          const t    = i / N;
          const elev = Math.sin(t * Math.PI) * arcHeight;
          pts.push(
            v1.clone()
              .applyAxisAngle(axis, angle * t)
              .normalize()
              .multiplyScalar(GLOBE_R + 0.006 + elev),
          );
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        routesGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: ARC_COLOR })));
      });
    }

    rebuildRef.current = buildRoutes;
    buildRoutes();

    const render = () => {
      requestAnimationFrame(render);
      if (autoRotate.current) group.rotation.y += 0.0006;
      renderer.render(scene, camera);
      (gl as any).endFrameEXP();
    };
    render();
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 195,
  },
});
