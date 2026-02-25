declare module "occt-import-js" {
    interface OcctMesh {
        attributes: {
            position: { array: number[] };
            normal?: { array: number[] };
        };
        index?: { array: number[] };
    }

    interface OcctResult {
        success: boolean;
        meshes: OcctMesh[];
    }

    interface OcctInstance {
        ReadStepFile(buffer: Uint8Array, params: null): OcctResult;
    }

    type OcctInitFn = (options?: { locateFile?: (filename: string) => string }) => Promise<OcctInstance>;

    const init: OcctInitFn;
    export default init;
}
