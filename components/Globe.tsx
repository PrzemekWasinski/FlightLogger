import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, PanResponder, Text } from 'react-native';
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
const POPUP_W       = 226;
const POPUP_H       = 74;
const POPUP_GAP     = 14;

type AirportMarker = {
  code: string;
  name: string;
  city: string;
  country: string;
  visits: number;
  position: THREE.Vector3;
  dot: THREE.Mesh;
};

type SelectedAirport = {
  code: string;
  name: string;
  city: string;
  country: string;
  visits: number;
  x: number;
  y: number;
  dotX: number;
  dotY: number;
};

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

const ARC_COLOR = new THREE.Color(1, 0, 0);

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
  onReady?: () => void;
}

export function Globe({ refreshKey = 0, onReady }: GlobeProps) {
  const groupRef    = useRef<THREE.Group | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const rebuildRef  = useRef<(() => void) | null>(null);
  const firstRender = useRef(true);
  const readyRef    = useRef(false);
  const airportMarkersRef = useRef<AirportMarker[]>([]);
  const selectedCodeRef = useRef<string | null>(null);
  const selectedMissFramesRef = useRef(0);
  const routeArcsRef = useRef<Array<{ curve: THREE.CatmullRomCurve3; mesh: THREE.Mesh; radius: number }>>([]);
  const viewSizeRef = useRef({ width: 1, height: 1 });
  const touchStartRef = useRef({ x: 0, y: 0, moved: false });
  const [selectedAirport, setSelectedAirport] = useState<SelectedAirport | null>(null);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    rebuildRef.current?.();
  }, [refreshKey]);

  const autoRotate    = useRef(true);
  const lastPos       = useRef({ x: 0, y: 0 });
  const isPinching    = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartZ   = useRef(CAM_DEFAULT_Z);

  function getZoomT(z: number) {
    const t = (z - CAM_MIN_Z) / (CAM_MAX_Z - CAM_MIN_Z);
    return Math.max(0, Math.min(1, t));
  }

  function getAirportDotRadius(z: number) {
    return 0.0025 + getZoomT(z) * 0.0105;
  }

  function getArcRadius(z: number) {
    return 0.00075 + getZoomT(z) * 0.00175;
  }

  function projectAirport(marker: AirportMarker): SelectedAirport | null {
    const group = groupRef.current;
    const camera = cameraRef.current;
    if (!group || !camera) return null;

    group.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    const { width, height } = viewSizeRef.current;
    const cameraDir = camera.position.clone().normalize();
    const worldPos = marker.position.clone().applyMatrix4(group.matrixWorld);
    if (worldPos.clone().normalize().dot(cameraDir) < -0.035) return null;

    const projected = worldPos.project(camera);
    if (projected.z < -1 || projected.z > 1) return null;

    const sx = (projected.x * 0.5 + 0.5) * width;
    const sy = (-projected.y * 0.5 + 0.5) * height;
    if (sx < -28 || sx > width + 28 || sy < -28 || sy > height + 28) return null;

    const popupX = sx - POPUP_W / 2;
    const popupY = sy - POPUP_H - POPUP_GAP;
    if (popupY < -POPUP_H * 0.72 || popupY > height + 12) return null;

    return {
      code: marker.code,
      name: marker.name,
      city: marker.city,
      country: marker.country,
      visits: marker.visits,
      x: popupX,
      y: popupY,
      dotX: sx,
      dotY: sy,
    };
  }

  function updateSelectedPopup() {
    const selectedCode = selectedCodeRef.current;
    if (!selectedCode) return;
    const marker = airportMarkersRef.current.find(item => item.code === selectedCode);
    if (!marker) {
      selectedCodeRef.current = null;
      setSelectedAirport(null);
      return;
    }

    const next = projectAirport(marker);
    if (!next) {
      selectedMissFramesRef.current += 1;
      if (selectedMissFramesRef.current > 18) {
        setSelectedAirport(null);
      }
      return;
    }
    selectedMissFramesRef.current = 0;

    setSelectedAirport(current => {
      if (
        current
        && current.code === next.code
        && Math.abs(current.x - next.x) < 1
        && Math.abs(current.y - next.y) < 1
        && Math.abs(current.dotX - next.dotX) < 1
        && Math.abs(current.dotY - next.dotY) < 1
      ) {
        return current;
      }
      return next;
    });
  }

  function pickAirport(x: number, y: number): boolean {
    const group = groupRef.current;
    const camera = cameraRef.current;
    const markers = airportMarkersRef.current;
    if (!group || !camera || markers.length === 0) {
      setSelectedAirport(null);
      return false;
    }

    group.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    const maxDist = Math.max(18, getAirportDotRadius(camera.position.z) * 950);
    let best: SelectedAirport | null = null;
    let bestDistSq = maxDist * maxDist;
    let bestCode: string | null = null;

    for (const marker of markers) {
      const projected = projectAirport(marker);
      if (!projected) continue;
      const dx = projected.dotX - x;
      const dy = projected.dotY - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = projected;
        bestCode = marker.code;
      }
    }

    selectedCodeRef.current = bestCode;
    selectedMissFramesRef.current = 0;
    setSelectedAirport(best);
    if (best) autoRotate.current = false;
    return !!best;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (e) => {
        autoRotate.current = false;
        const t = e.nativeEvent.touches;
        if (t.length === 1) {
          lastPos.current = { x: t[0].pageX, y: t[0].pageY };
          touchStartRef.current = {
            x: e.nativeEvent.locationX,
            y: e.nativeEvent.locationY,
            moved: false,
          };
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
          if (Math.abs(dx) + Math.abs(dy) > 4) touchStartRef.current.moved = true;
          lastPos.current = { x: t[0].pageX, y: t[0].pageY };
          const g = groupRef.current;
          if (!g) return;
          g.rotation.y += dx * 0.005;
          g.rotation.x = Math.max(-1.2, Math.min(1.2, g.rotation.x + dy * 0.005));
        }
      },

      onPanResponderRelease: (e) => {
        const wasPinching = isPinching.current;
        isPinching.current = false;
        const start = touchStartRef.current;
        const dx = e.nativeEvent.locationX - start.x;
        const dy = e.nativeEvent.locationY - start.y;
        if (!wasPinching && !start.moved && dx * dx + dy * dy < 64) {
          if (pickAirport(e.nativeEvent.locationX, e.nativeEvent.locationY)) return;
        }
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
      routeArcsRef.current = [];

      const flights = getAllFlights();

      const usedAirports = new Set<string>();
      const airportVisits = new Map<string, number>();
      flights.forEach(({ from, to }) => {
        usedAirports.add(from); usedAirports.add(to);
        airportVisits.set(from, (airportVisits.get(from) ?? 0) + 1);
        airportVisits.set(to, (airportVisits.get(to) ?? 0) + 1);
      });
      const airportMarkers: AirportMarker[] = [];
      const dotGeo = new THREE.SphereGeometry(1, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0x65d0c2,
        depthTest: false,
        depthWrite: false,
      });
      usedAirports.forEach(code => {
        const ap = AIRPORTS[code];
        if (!ap) return;
        const position = latLonToVec3(ap.lat, ap.lon, GLOBE_R + 0.014);
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(position);
        const radius = getAirportDotRadius(camera.position.z);
        dot.scale.setScalar(radius);
        routesGroup.add(dot);
        airportMarkers.push({
          code,
          name: ap.name,
          city: ap.city,
          country: ap.country,
          visits: airportVisits.get(code) ?? 0,
          position,
          dot,
        });
      });
      airportMarkersRef.current = airportMarkers;
      setSelectedAirport(current => (
        current && airportMarkers.some(marker => marker.code === current.code) ? current : null
      ));
      if (selectedCodeRef.current && !airportMarkers.some(marker => marker.code === selectedCodeRef.current)) {
        selectedCodeRef.current = null;
      }

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
        const curve = new THREE.CatmullRomCurve3(pts);
        const radius = getArcRadius(camera.position.z);
        const geo = new THREE.TubeGeometry(curve, 80, radius, 6, false);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ARC_COLOR }));
        routeArcsRef.current.push({ curve, mesh, radius });
        routesGroup.add(mesh);
      });
    }

    rebuildRef.current = buildRoutes;
    buildRoutes();

    const render = () => {
      requestAnimationFrame(render);
      if (autoRotate.current) group.rotation.y += 0.0006;
      const dotRadius = getAirportDotRadius(camera.position.z);
      const cameraDir = camera.position.clone().normalize();
      const markerWorldPos = new THREE.Vector3();
      airportMarkersRef.current.forEach(marker => {
        markerWorldPos.copy(marker.position).applyMatrix4(group.matrixWorld);
        const visible = markerWorldPos.normalize().dot(cameraDir) > 0.035;
        marker.dot.visible = visible;
        marker.dot.scale.setScalar(dotRadius);
      });
      const arcRadius = getArcRadius(camera.position.z);
      routeArcsRef.current.forEach(arc => {
        if (Math.abs(arc.radius - arcRadius) < 0.00025) return;
        arc.mesh.geometry.dispose();
        arc.mesh.geometry = new THREE.TubeGeometry(arc.curve, 80, arcRadius, 6, false);
        arc.radius = arcRadius;
      });
      if (selectedCodeRef.current) {
        updateSelectedPopup();
      }
      renderer.render(scene, camera);
      (gl as any).endFrameEXP();
      if (!readyRef.current) {
        readyRef.current = true;
        onReady?.();
      }
    };
    render();
  };

  return (
    <View
      style={styles.container}
      onLayout={e => { viewSizeRef.current = e.nativeEvent.layout; }}
      {...panResponder.panHandlers}
    >
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      {selectedAirport && (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.airportConnector,
              {
                left: selectedAirport.dotX - 0.75,
                top: selectedAirport.y + POPUP_H - 2,
                height: Math.max(10, selectedAirport.dotY - selectedAirport.y - POPUP_H - 5),
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.airportPopup,
              { left: selectedAirport.x, top: selectedAirport.y },
            ]}
          >
            <View style={styles.airportTopRow}>
              <Text style={styles.airportCode}>{selectedAirport.code}</Text>
              <Text style={styles.airportVisits}>
                {selectedAirport.visits} {selectedAirport.visits === 1 ? 'Visit' : 'Visits'}
              </Text>
            </View>
            <Text style={styles.airportName} numberOfLines={2}>{selectedAirport.name}</Text>
            <Text style={styles.airportPlace} numberOfLines={1}>
              {selectedAirport.city}{selectedAirport.country ? `, ${selectedAirport.country}` : ''}
            </Text>
          </View>
        </>
      )}
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
  airportPopup: {
    position: 'absolute',
    width: POPUP_W,
    minHeight: POPUP_H,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(7, 17, 31, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(240, 179, 90, 0.42)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  airportConnector: {
    position: 'absolute',
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(240, 179, 90, 0.78)',
  },
  airportName: {
    color: '#d8e8ef',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  airportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  airportCode: {
    color: '#07111f',
    backgroundColor: '#f0b35a',
    borderRadius: 6,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  airportPlace: {
    marginTop: 4,
    color: '#65d0c2',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  airportVisits: {
    color: '#f0b35a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
});
