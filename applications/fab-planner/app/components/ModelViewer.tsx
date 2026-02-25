"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { type ViewerSettings, loadViewerSettings, DEFAULT_VIEWER_SETTINGS } from "@/app/lib/viewerSettings";

interface ModelViewerProps {
    fileUrl: string | null;
    fileType: string;
}

/**
 * Compute an Oriented Bounding Box (OBB) using PCA.
 * Returns the tight-fitting dimensions regardless of object rotation.
 * O(n) on vertex count — runs once at load, no rendering impact.
 */
function computeOBBDimensions(geometry: THREE.BufferGeometry): { x: number; y: number; z: number } {
    const pos = geometry.getAttribute("position");
    const n = pos.count;
    if (n < 3) {
        geometry.computeBoundingBox();
        const s = new THREE.Vector3();
        geometry.boundingBox!.getSize(s);
        return { x: s.x, y: s.y, z: s.z };
    }

    // 1. Compute centroid
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) {
        cx += pos.getX(i);
        cy += pos.getY(i);
        cz += pos.getZ(i);
    }
    cx /= n; cy /= n; cz /= n;

    // 2. Compute 3x3 covariance matrix (upper triangle, symmetric)
    let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0;
    for (let i = 0; i < n; i++) {
        const dx = pos.getX(i) - cx;
        const dy = pos.getY(i) - cy;
        const dz = pos.getZ(i) - cz;
        cxx += dx * dx; cxy += dx * dy; cxz += dx * dz;
        cyy += dy * dy; cyz += dy * dz;
        czz += dz * dz;
    }
    cxx /= n; cxy /= n; cxz /= n; cyy /= n; cyz /= n; czz /= n;

    // 3. Find eigenvectors via power iteration (3 passes for 3 axes)
    const findEigenvector = (mat: number[][], deflated: THREE.Vector3[]): THREE.Vector3 => {
        let v = new THREE.Vector3(1, 1, 1).normalize();
        for (let iter = 0; iter < 30; iter++) {
            const nv = new THREE.Vector3(
                mat[0][0] * v.x + mat[0][1] * v.y + mat[0][2] * v.z,
                mat[1][0] * v.x + mat[1][1] * v.y + mat[1][2] * v.z,
                mat[2][0] * v.x + mat[2][1] * v.y + mat[2][2] * v.z
            );
            for (const d of deflated) {
                const proj = nv.dot(d);
                nv.x -= proj * d.x;
                nv.y -= proj * d.y;
                nv.z -= proj * d.z;
            }
            const len = nv.length();
            if (len < 1e-10) break;
            v = nv.divideScalar(len);
        }
        return v;
    };

    const covMat = [
        [cxx, cxy, cxz],
        [cxy, cyy, cyz],
        [cxz, cyz, czz],
    ];

    const e1 = findEigenvector(covMat, []);
    const e2 = findEigenvector(covMat, [e1]);
    const e3 = new THREE.Vector3().crossVectors(e1, e2).normalize();

    // 4. Project all vertices onto the principal axes and measure extents
    let min1 = Infinity, max1 = -Infinity;
    let min2 = Infinity, max2 = -Infinity;
    let min3 = Infinity, max3 = -Infinity;
    const pt = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
        pt.set(pos.getX(i) - cx, pos.getY(i) - cy, pos.getZ(i) - cz);
        const p1 = pt.dot(e1), p2 = pt.dot(e2), p3 = pt.dot(e3);
        if (p1 < min1) min1 = p1; if (p1 > max1) max1 = p1;
        if (p2 < min2) min2 = p2; if (p2 > max2) max2 = p2;
        if (p3 < min3) min3 = p3; if (p3 > max3) max3 = p3;
    }

    // Sort dimensions largest→smallest for consistent labeling
    const dims = [max1 - min1, max2 - min2, max3 - min3].sort((a, b) => b - a);
    return { x: dims[0], y: dims[1], z: dims[2] };
}

export default function ModelViewer({ fileUrl, fileType }: ModelViewerProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
    const [showBBox, setShowBBox] = useState(true);

    // Section View State
    const [sectionView, setSectionView] = useState(false);
    const [clipX, setClipX] = useState(1);
    const [clipY, setClipY] = useState(1);
    const [clipZ, setClipZ] = useState(1);
    const planesRef = useRef<THREE.Plane[]>([
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 100),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), 100),
    ]);

    const bboxHelperRef = useRef<THREE.BoxHelper | null>(null);
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const animationRef = useRef<number | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);

    // Load viewer settings from localStorage
    const settingsRef = useRef<ViewerSettings>(loadViewerSettings());

    // Listen for settings changes from the settings panel
    useEffect(() => {
        const handleSettingsChange = () => {
            settingsRef.current = loadViewerSettings();
        };
        window.addEventListener("viewer-settings-changed", handleSettingsChange);
        return () => window.removeEventListener("viewer-settings-changed", handleSettingsChange);
    }, []);

    // Update clipping planes when state changes
    useEffect(() => {
        if (!dimensions) return;

        const xVal = (clipX - 0.5) * dimensions.x;
        const yVal = (clipY - 0.5) * dimensions.y;
        const zVal = (clipZ - 0.5) * dimensions.z;

        const scale = dimensions ? 80 / Math.max(dimensions.x, dimensions.y, dimensions.z) : 1;

        planesRef.current[0].constant = xVal * scale;
        planesRef.current[1].constant = yVal * scale;
        planesRef.current[2].constant = zVal * scale;
    }, [clipX, clipY, clipZ, dimensions]);

    useEffect(() => {
        if (!canvasRef.current || !fileUrl) return;

        const canvasContainer = canvasRef.current;
        const loadId = fileUrl;
        const isCurrentLoad = () => loadId === fileUrl;
        const vs = settingsRef.current;

        // Clean up previous renderer
        if (rendererRef.current) {
            const r = rendererRef.current;
            r.dispose();
            const extension = r.getContext().getExtension('WEBGL_lose_context');
            if (extension) extension.loseContext();
            rendererRef.current = null;
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        while (canvasContainer.firstChild) {
            canvasContainer.removeChild(canvasContainer.firstChild);
        }

        setLoading(true);
        setError(null);
        setDimensions(null);

        // Scene setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(vs.backgroundColor);

        // Camera
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
        camera.position.set(100, 80, 100);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = vs.environmentIntensity;
        canvasContainer.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Lighting — balanced PBR setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xf0f0ff, 0x404040, 0.4);
        scene.add(hemiLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight1.position.set(50, 100, 50);
        dirLight1.castShadow = true;
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight2.position.set(-50, 50, -50);
        scene.add(dirLight2);

        const rimLight = new THREE.PointLight(0xffffff, 0.15);
        rimLight.position.set(0, -50, 0);
        scene.add(rimLight);

        // Grid
        if (vs.showGrid) {
            const grid = new THREE.GridHelper(200, 20, 0x3c3c3c, 0x2d2d2d);
            scene.add(grid);
        }

        // Palette for automatic coloring (FBX/STEP multi-mesh)
        const palette = [
            0x569cd6, 0x4ec9b0, 0xce9178, 0x9cdcfe, 0xb5cea8,
            0xef4444, 0x22c55e, 0x3b82f6, 0xeab308, 0xa855f7,
            0xec4899, 0xf97316, 0x06b6d4, 0x8b5cf6, 0x10b981,
            0xf43f5e, 0x6366f1, 0x84cc16, 0x64748b, 0xd946ef
        ];

        const getAutoColor = (str: string, index: number) => {
            let hash = 0;
            const seed = str || `mesh_${index}`;
            for (let i = 0; i < seed.length; i++) {
                hash = seed.charCodeAt(i) + ((hash << 5) - hash);
            }
            return palette[Math.abs(hash) % palette.length];
        };

        /** Determine side based on whether section clipping is active */
        const getSide = () => sectionView ? THREE.DoubleSide : THREE.FrontSide;

        const applyMaterialOverrides = (mesh: THREE.Mesh, index: number) => {
            if (!mesh.material) return;
            const oldMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const newMats = oldMats.map((mat) => {
                const autoColorHex = getAutoColor(mesh.name || mesh.uuid, index);
                const autoColor = new THREE.Color(autoColorHex);

                const c = (mat as any).color;
                const isDefaultColor = !c || (Math.abs(c.r - c.g) < 0.02 && Math.abs(c.g - c.b) < 0.02);
                const finalColor = isDefaultColor ? autoColor : c.clone();

                const m = new THREE.MeshStandardMaterial({
                    color: finalColor,
                    roughness: vs.roughness,
                    metalness: vs.metalness,
                    wireframe: vs.wireframe,
                    side: getSide(),
                    clippingPlanes: planesRef.current,
                    clipIntersection: false,
                });

                m.needsUpdate = true;
                return m;
            });
            mesh.material = Array.isArray(mesh.material) ? newMats : newMats[0];
        };

        // Helper: create material from viewer settings
        const createMaterial = (colorOverride?: THREE.Color) => {
            return new THREE.MeshStandardMaterial({
                color: colorOverride || new THREE.Color(vs.color),
                roughness: vs.roughness,
                metalness: vs.metalness,
                wireframe: vs.wireframe,
                side: getSide(),
                clippingPlanes: planesRef.current,
                clipIntersection: false,
            });
        };

        // Helper: add a mesh to the scene, center/scale it, position camera
        const addMeshToScene = (geometry: THREE.BufferGeometry) => {
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            const box = geometry.boundingBox!;
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const obbDims = computeOBBDimensions(geometry);
            const mDim = Math.max(size.x, size.y, size.z);
            const sFactor = mDim > 0 ? 80 / mDim : 1;

            setDimensions({
                x: parseFloat(obbDims.x.toFixed(2)),
                y: parseFloat(obbDims.y.toFixed(2)),
                z: parseFloat(obbDims.z.toFixed(2)),
            });

            const material = createMaterial();

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            mesh.scale.setScalar(sFactor);
            mesh.position.set(
                -center.x * sFactor,
                -box.min.y * sFactor,
                -center.z * sFactor
            );

            scene.add(mesh);

            // Add bounding box wireframe
            const boxHelper = new THREE.BoxHelper(mesh, 0xffcc00);
            boxHelper.visible = showBBox;
            scene.add(boxHelper);
            bboxHelperRef.current = boxHelper;

            // Add colored axes at the bbox min corner
            const scaledBox = new THREE.Box3().setFromObject(mesh);
            const axisLength = 80 * 0.35;
            const axes = new THREE.AxesHelper(axisLength);
            axes.position.copy(scaledBox.min);
            axes.visible = showBBox;
            scene.add(axes);
            axesHelperRef.current = axes;

            const dist = 80 * 1.8;
            camera.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
            const focalPoint = new THREE.Vector3(0, (size.y * sFactor) / 2, 0);
            camera.lookAt(focalPoint);
            controls.target.copy(focalPoint);
            controls.update();
            setLoading(false);
        };

        // Load model based on file type
        const ext = fileType.toLowerCase();

        if (ext === "stl") {
            const loader = new STLLoader();
            loader.load(
                fileUrl,
                (geometry) => {
                    if (!isCurrentLoad()) return;
                    addMeshToScene(geometry);
                },
                undefined,
                (err) => {
                    if (!isCurrentLoad()) return;
                    console.error("STL load error:", err);
                    setError("Failed to load STL file");
                    setLoading(false);
                }
            );
        } else if (ext === "fbx") {
            const loader = new FBXLoader();
            loader.load(
                fileUrl,
                (fbxGroup) => {
                    if (!isCurrentLoad()) return;
                    const box = new THREE.Box3().setFromObject(fbxGroup);
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    const size = new THREE.Vector3();
                    box.getSize(size);

                    const mDim = Math.max(size.x, size.y, size.z);
                    const sFactor = mDim > 0 ? 80 / mDim : 1;

                    setDimensions({
                        x: parseFloat(size.x.toFixed(2)),
                        y: parseFloat(size.y.toFixed(2)),
                        z: parseFloat(size.z.toFixed(2)),
                    });

                    fbxGroup.scale.setScalar(sFactor);
                    fbxGroup.position.set(
                        -center.x * sFactor,
                        -box.min.y * sFactor,
                        -center.z * sFactor
                    );

                    let meshCount = 0;
                    fbxGroup.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            meshCount++;
                            applyMaterialOverrides(child as THREE.Mesh, meshCount);
                        }
                    });

                    scene.add(fbxGroup);

                    const boxHelper = new THREE.BoxHelper(fbxGroup, 0xffcc00);
                    boxHelper.visible = showBBox;
                    scene.add(boxHelper);
                    bboxHelperRef.current = boxHelper;

                    const scaledBox = new THREE.Box3().setFromObject(fbxGroup);
                    const axisLength = 80 * 0.35;
                    const axes = new THREE.AxesHelper(axisLength);
                    axes.position.copy(scaledBox.min);
                    axes.visible = showBBox;
                    scene.add(axes);
                    axesHelperRef.current = axes;

                    const dist = 80 * 1.8;
                    camera.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
                    const focalPoint = new THREE.Vector3(0, (size.y * sFactor) / 2, 0);
                    camera.lookAt(focalPoint);
                    controls.target.copy(focalPoint);
                    controls.update();
                    setLoading(false);
                },
                undefined,
                (err) => {
                    console.error("FBX load error:", err);
                    setError("Failed to load FBX file");
                    setLoading(false);
                }
            );
        } else if (ext === "step" || ext === "stp") {
            // Load STEP via occt-import-js (WASM)
            (async () => {
                try {
                    const occtModule = await import("occt-import-js");
                    const occt = await (occtModule.default || occtModule)({
                        locateFile: () => "/wasm/occt-import-js.wasm",
                    });

                    const response = await fetch(fileUrl);
                    const buffer = await response.arrayBuffer();
                    const fileBuffer = new Uint8Array(buffer);

                    const result = occt.ReadStepFile(fileBuffer, null);

                    if (!result.success || result.meshes.length === 0) {
                        setError("Failed to parse STEP file");
                        setLoading(false);
                        return;
                    }

                    let meshIndex = 0;
                    const stepGroup = new THREE.Group();

                    for (const meshData of result.meshes) {
                        const geometry = new THREE.BufferGeometry();
                        geometry.setAttribute("position", new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
                        if (meshData.attributes.normal) {
                            geometry.setAttribute("normal", new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
                        } else {
                            geometry.computeVertexNormals();
                        }
                        if (meshData.index) {
                            geometry.setIndex(new THREE.Uint32BufferAttribute(meshData.index.array, 1));
                        }

                        const meshAny = meshData as any;
                        const color = meshAny.color
                            ? new THREE.Color(meshAny.color[0], meshAny.color[1], meshAny.color[2])
                            : new THREE.Color(getAutoColor(meshAny.name || `component_${meshIndex}`, meshIndex));

                        const material = createMaterial(color);

                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        stepGroup.add(mesh);
                        meshIndex++;
                    }

                    // Centering & Scaling
                    const box = new THREE.Box3().setFromObject(stepGroup);
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    const size = new THREE.Vector3();
                    box.getSize(size);

                    const mDim = Math.max(size.x, size.y, size.z);
                    const sFactor = mDim > 0 ? 80 / mDim : 1;

                    setDimensions({
                        x: parseFloat(size.x.toFixed(2)),
                        y: parseFloat(size.y.toFixed(2)),
                        z: parseFloat(size.z.toFixed(2)),
                    });

                    stepGroup.scale.setScalar(sFactor);
                    stepGroup.position.set(
                        -center.x * sFactor,
                        -box.min.y * sFactor,
                        -center.z * sFactor
                    );

                    scene.add(stepGroup);

                    const boxHelper = new THREE.BoxHelper(stepGroup, 0xffcc00);
                    boxHelper.visible = showBBox;
                    scene.add(boxHelper);
                    bboxHelperRef.current = boxHelper;

                    const scaledBox = new THREE.Box3().setFromObject(stepGroup);
                    const axisLength = 80 * 0.35;
                    const axes = new THREE.AxesHelper(axisLength);
                    axes.position.copy(scaledBox.min);
                    axes.visible = showBBox;
                    scene.add(axes);
                    axesHelperRef.current = axes;

                    const dist = 80 * 1.8;
                    camera.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
                    const focalPoint = new THREE.Vector3(0, (size.y * sFactor) / 2, 0);
                    camera.lookAt(focalPoint);
                    controls.target.copy(focalPoint);
                    controls.update();
                    if (!isCurrentLoad()) return;
                    setLoading(false);
                } catch (err) {
                    if (!isCurrentLoad()) return;
                    console.error("STEP load error:", err);
                    setError("Failed to load STEP file: " + (err instanceof Error ? err.message : String(err)));
                    setLoading(false);
                }
            })();
        } else if (ext === "sldprt" || ext === "sldasm" || ext === "slddrw") {
            // Native SolidWorks files cannot be parsed in the browser
            setLoading(false);
            setError("__solidworks__");
        } else {
            setLoading(false);
            setError(`Unsupported format: .${fileType}`);
        }

        // Animation loop
        function animate() {
            animationRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Resize handler
        const onResize = () => {
            const w = canvasContainer.clientWidth;
            const h = canvasContainer.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        const resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(canvasContainer);

        return () => {
            resizeObserver.disconnect();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            while (canvasContainer.firstChild) {
                canvasContainer.removeChild(canvasContainer.firstChild);
            }
        };
    }, [fileUrl, fileType]);

    // Handle Clipping Plane toggle
    useEffect(() => {
        if (!rendererRef.current) return;
        rendererRef.current.localClippingEnabled = sectionView;
        if (!sectionView) {
            planesRef.current.forEach(p => p.constant = 1000);
        } else {
            setClipX(prev => prev);
            setClipY(prev => prev);
            setClipZ(prev => prev);
        }

        // Update material side when section view toggles
        if (sceneRef.current) {
            sceneRef.current.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    const mesh = obj as THREE.Mesh;
                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    mats.forEach((m) => {
                        if (m instanceof THREE.MeshStandardMaterial) {
                            m.side = sectionView ? THREE.DoubleSide : THREE.FrontSide;
                            m.needsUpdate = true;
                        }
                    });
                }
            });
        }
    }, [sectionView]);

    if (!fileUrl) {
        return (
            <div className="viewer-container">
                <div className="viewer-placeholder">
                    <div className="icon">📦</div>
                    <p>No file uploaded yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="viewer-container" style={{ position: "relative" }}>
            {/* Dedicated div for Three.js — React never touches its children */}
            <div
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, zIndex: 0 }}
            />
            {/* React-managed overlays sit on top */}
            {loading && (
                <div className="viewer-placeholder" style={{ position: "relative", zIndex: 1 }}>
                    <div className="icon">⏳</div>
                    <p>Loading model...</p>
                </div>
            )}
            {error && error === "__solidworks__" ? (
                <div className="viewer-placeholder" style={{ position: "relative", zIndex: 1 }}>
                    <div className="icon" style={{ fontSize: 36 }}>🔩</div>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>SolidWorks Native File</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220, lineHeight: 1.5 }}>
                        Native .{fileType} files are stored for download. Export as <strong>STEP (.step)</strong> from SolidWorks for 3D preview.
                    </p>
                </div>
            ) : error && (
                <div className="viewer-placeholder" style={{ position: "relative", zIndex: 1 }}>
                    <div className="icon">⚠️</div>
                    <p>{error}</p>
                </div>
            )}

            {/* Top Toolbar */}
            <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3, display: "flex", gap: 6 }}>
                {/* Bounding Box Toggle */}
                {dimensions && !loading && !error && (
                    <button
                        onClick={() => {
                            const next = !showBBox;
                            setShowBBox(next);
                            if (bboxHelperRef.current) bboxHelperRef.current.visible = next;
                            if (axesHelperRef.current) axesHelperRef.current.visible = next;
                        }}
                        style={{
                            background: showBBox ? "rgba(255,204,0,0.2)" : "rgba(0,0,0,0.5)",
                            border: showBBox ? "1px solid rgba(255,204,0,0.6)" : "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 5, padding: "4px 8px", fontSize: 11, color: showBBox ? "#ffcc00" : "#999",
                            cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s",
                        }}
                        title="Toggle bounding box"
                    >
                        ⬜ BBox
                    </button>
                )}

                {/* Section View Toggle */}
                {dimensions && !loading && !error && (
                    <button
                        onClick={() => setSectionView(!sectionView)}
                        style={{
                            background: sectionView ? "rgba(0,180,255,0.2)" : "rgba(0,0,0,0.5)",
                            border: sectionView ? "1px solid rgba(0,180,255,0.6)" : "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 5, padding: "4px 8px", fontSize: 11, color: sectionView ? "#00b4ff" : "#999",
                            cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s",
                        }}
                        title="Toggle section view"
                    >
                        🔪 Section
                    </button>
                )}
            </div>

            {/* Section View Controls */}
            {sectionView && dimensions && (
                <div style={{
                    position: "absolute", top: 45, right: 8, zIndex: 4,
                    background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(0,180,255,0.3)", borderRadius: 8,
                    padding: "10px", width: 140, display: "flex", flexDirection: "column", gap: 10
                }}>
                    <div style={{ fontSize: 10, color: "#00b4ff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Clipping Planes</div>

                    {/* X Control */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                            <span style={{ color: "#ef4444" }}>X AXIS</span>
                            <span style={{ color: "#888" }}>{Math.round(clipX * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01" value={clipX}
                            onChange={(e) => setClipX(parseFloat(e.target.value))}
                            style={{ width: "100%", cursor: "pointer", accentColor: "#ef4444" }}
                        />
                    </div>

                    {/* Y Control */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                            <span style={{ color: "#22c55e" }}>Y AXIS</span>
                            <span style={{ color: "#888" }}>{Math.round(clipY * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01" value={clipY}
                            onChange={(e) => setClipY(parseFloat(e.target.value))}
                            style={{ width: "100%", cursor: "pointer", accentColor: "#22c55e" }}
                        />
                    </div>

                    {/* Z Control */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                            <span style={{ color: "#3b82f6" }}>Z AXIS</span>
                            <span style={{ color: "#888" }}>{Math.round(clipZ * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01" value={clipZ}
                            onChange={(e) => setClipZ(parseFloat(e.target.value))}
                            style={{ width: "100%", cursor: "pointer", accentColor: "#3b82f6" }}
                        />
                    </div>

                    <button
                        onClick={() => { setClipX(1); setClipY(1); setClipZ(1); }}
                        style={{
                            marginTop: 5, background: "rgba(255,255,255,0.1)", border: "none",
                            borderRadius: 4, padding: "4px", fontSize: 9, color: "#ccc", cursor: "pointer"
                        }}
                    >
                        🔄 Reset Planes
                    </button>
                </div>
            )}

            {/* Dimensions overlay (visible when bbox is on) */}
            {dimensions && showBBox && !loading && !error && (
                <div style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    zIndex: 2,
                    background: "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(6px)",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "#ccc",
                    lineHeight: 1.6,
                    pointerEvents: "none",
                    border: "1px solid rgba(255,204,0,0.3)",
                }}>
                    <div style={{ fontWeight: 600, color: "#ffcc00", marginBottom: 2, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Dimensions (OBB)</div>
                    <div><span style={{ color: "#ef4444" }}>X</span> {dimensions.x} mm</div>
                    <div><span style={{ color: "#22c55e" }}>Y</span> {dimensions.y} mm</div>
                    <div><span style={{ color: "#3b82f6" }}>Z</span> {dimensions.z} mm</div>
                </div>
            )}
        </div>
    );
}
