/**
 * Minecraft Schematic Viewer
 * Parses .schematic files (MCEdit format) and renders them as voxels using Three.js InstancedMesh
 */

class SchematicViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.instancedMesh = null;
        this.blocks = [];
        this.width = 0;
        this.height = 0;
        this.length = 0;

        // Block color mapping based on official Minecraft Map Base Colors
        // Source: https://minecraft.wiki/w/Map_item_format
        // Each block ID is mapped to its corresponding map base color RGB value
        this.blockColors = {
            0: 0x000000,   // Air (transparent)
            1: 0x707070,   // Stone (STONE: 112,112,112)
            2: 0x7FB238,   // Grass Block (GRASS: 127,178,56)
            3: 0x976D4D,   // Dirt (DIRT: 151,109,77)
            4: 0x707070,   // Cobblestone (STONE: 112,112,112)
            5: 0x8F7748,   // Oak Planks (WOOD: 143,119,72)
            6: 0x7FB238,   // Sapling (GRASS: 127,178,56)
            7: 0x707070,   // Bedrock (STONE: 112,112,112)
            8: 0x4040FF,   // Water (WATER: 64,64,255)
            9: 0x4040FF,   // Water (Stationary)
            10: 0xFF0000,  // Lava (FIRE: 255,0,0)
            11: 0xFF0000,  // Lava (Stationary)
            12: 0xF7E9A3,  // Sand (SAND: 247,233,163)
            13: 0xA4A8B8,  // Gravel (CLAY: 164,168,184)
            14: 0xFAEE4D,  // Gold Ore (GOLD: 250,238,77)
            15: 0xA7A7A7,  // Iron Ore (METAL: 167,167,167)
            16: 0x707070,  // Coal Ore (STONE: 112,112,112)
            17: 0x8F7748,  // Oak Log (WOOD: 143,119,72)
            18: 0x007C00,  // Oak Leaves (PLANT: 0,124,0)
            19: 0xF7E9A3,  // Sponge (SAND: 247,233,163)
            20: 0xA0A0FF,  // Glass (ICE: 160,160,255)
            21: 0x4A80FF,  // Lapis Ore (LAPIS: 74,128,255)
            22: 0x4A80FF,  // Lapis Block (LAPIS: 74,128,255)
            23: 0x707070,  // Dispenser (STONE: 112,112,112)
            24: 0xF7E9A3,  // Sandstone (SAND: 247,233,163)
            25: 0x8F7748,  // Note Block (WOOD: 143,119,72)
            26: 0xC7C7C7,  // Bed (WOOL: 199,199,199)
            27: 0xA7A7A7,  // Powered Rail (METAL: 167,167,167)
            28: 0xA7A7A7,  // Detector Rail (METAL: 167,167,167)
            29: 0x007C00,  // Sticky Piston (PLANT: 0,124,0)
            30: 0xC7C7C7,  // Cobweb (WOOL: 199,199,199)
            31: 0x007C00,  // Tall Grass (PLANT: 0,124,0)
            32: 0x976D4D,  // Dead Bush (DIRT: 151,109,77)
            33: 0x007C00,  // Piston (PLANT: 0,124,0)
            34: 0x007C00,  // Piston Head (PLANT: 0,124,0
            35: 0xC7C7C7,  // Wool (White) (WOOL: 199,199,199)
            37: 0x007C00,  // Dandelion (PLANT: 0,124,0)
            38: 0xFF0000,  // Poppy (FIRE: 255,0,0)
            39: 0x976D4D,  // Brown Mushroom (DIRT: 151,109,77)
            40: 0xFF0000,  // Red Mushroom (FIRE: 255,0,0)
            41: 0xFAEE4D,  // Gold Block (GOLD: 250,238,77)
            42: 0xA7A7A7,  // Iron Block (METAL: 167,167,167)
            43: 0x707070,  // Double Stone Slab (STONE: 112,112,112)
            44: 0x707070,  // Stone Slab (STONE: 112,112,112)
            45: 0xFF0000,  // Bricks (FIRE: 255,0,0)
            46: 0xFF0000,  // TNT (FIRE: 255,0,0)
            47: 0x8F7748,  // Bookshelf (WOOD: 143,119,72)
            48: 0x707070,  // Mossy Cobblestone (STONE: 112,112,112)
            49: 0x191919,  // Obsidian (BLACK: 25,25,25)
            50: 0xFFFFFF,  // Torch (SNOW: 255,255,255)
            51: 0xFF0000,  // Fire (FIRE: 255,0,0)
            52: 0x707070,  // Monster Spawner (STONE: 112,112,112)
            53: 0x8F7748,  // Oak Stairs (WOOD: 143,119,72)
            54: 0x8F7748,  // Chest (WOOD: 143,119,72)
            55: 0xFF0000,  // Redstone Wire (FIRE: 255,0,0)
            56: 0x5CDBD5,  // Diamond Ore (DIAMOND: 92,219,213)
            57: 0x5CDBD5,  // Diamond Block (DIAMOND: 92,219,213)
            58: 0x8F7748,  // Crafting Table (WOOD: 143,119,72)
            59: 0x007C00,  // Wheat Crops (PLANT: 0,124,0)
            60: 0x976D4D,  // Farmland (DIRT: 151,109,77)
            61: 0x707070,  // Furnace (STONE: 112,112,112)
            62: 0x707070,  // Burning Furnace (STONE: 112,112,112)
            63: 0x8F7748,  // Sign Post (WOOD: 143,119,72)
            64: 0x8F7748,  // Oak Door (WOOD: 143,119,72)
            65: 0x8F7748,  // Ladder (WOOD: 143,119,72)
            66: 0xA7A7A7,  // Rail (METAL: 167,167,167)
            67: 0x707070,  // Cobblestone Stairs (STONE: 112,112,112)
            68: 0x8F7748,  // Wall Sign (WOOD: 143,119,72)
            69: 0x8F7748,  // Lever (WOOD: 143,119,72)
            70: 0x707070,  // Stone Pressure Plate (STONE: 112,112,112)
            71: 0xA7A7A7,  // Iron Door (METAL: 167,167,167)
            72: 0x8F7748,  // Wooden Pressure Plate (WOOD: 143,119,72)
            73: 0xFF0000,  // Redstone Ore (FIRE: 255,0,0)
            74: 0xFF0000,  // Glowing Redstone Ore (FIRE: 255,0,0)
            75: 0xFF0000,  // Redstone Torch (Off) (FIRE: 255,0,0)
            76: 0xFF0000,  // Redstone Torch (FIRE: 255,0,0)
            77: 0x707070,  // Stone Button (STONE: 112,112,112)
            78: 0xFFFFFF,  // Snow (SNOW: 255,255,255)
            79: 0xA0A0FF,  // Ice (ICE: 160,160,255)
            80: 0xFFFFFF,  // Snow Block (SNOW: 255,255,255)
            81: 0x007C00,  // Cactus (PLANT: 0,124,0)
            82: 0xA4A8B8,  // Clay (CLAY: 164,168,184)
            83: 0x007C00,  // Sugar Cane (PLANT: 0,124,0)
            84: 0x8F7748,  // Jukebox (WOOD: 143,119,72)
            85: 0x8F7748,  // Oak Fence (WOOD: 143,119,72)
            86: 0xD87F33,  // Pumpkin (ORANGE: 216,127,51)
            87: 0x700200,  // Netherrack (NETHER: 112,2,0)
            88: 0xF7E9A3,  // Soul Sand (SAND: 247,233,163)
            89: 0xF7E9A3,  // Glowstone (SAND: 247,233,163)
            90: 0x4040FF,  // Nether Portal (WATER: 64,64,255)
            91: 0xD87F33,  // Jack o'Lantern (ORANGE: 216,127,51)
            92: 0xFFFFFF,  // Cake (SNOW: 255,255,255)
            93: 0xFF0000,  // Repeater (Off) (FIRE: 255,0,0)
            94: 0xFF0000,  // Repeater (On) (FIRE: 255,0,0)
            95: 0xA0A0FF,  // White Stained Glass (ICE: 160,160,255)
            96: 0x8F7748,  // Trapdoor (WOOD: 143,119,72)
            97: 0x707070,  // Monster Egg (STONE: 112,112,112)
            98: 0x707070,  // Stone Bricks (STONE: 112,112,112)
            99: 0x976D4D,  // Huge Brown Mushroom (DIRT: 151,109,77)
            100: 0xFF0000, // Huge Red Mushroom (FIRE: 255,0,0)
            101: 0xA7A7A7, // Iron Bars (METAL: 167,167,167)
            102: 0xA0A0FF, // Glass Pane (ICE: 160,160,255)
            103: 0x7FCC19, // Melon (LIGHT_GREEN: 127,204,25)
            104: 0x007C00, // Pumpkin Stem (PLANT: 0,124,0)
            105: 0x007C00, // Melon Stem (PLANT: 0,124,0)
            106: 0x007C00, // Vines (PLANT: 0,124,0)
            107: 0x8F7748, // Oak Fence Gate (WOOD: 143,119,72)
            108: 0xFF0000, // Brick Stairs (FIRE: 255,0,0)
            109: 0x707070, // Stone Brick Stairs (STONE: 112,112,112)
            110: 0x976D4D, // Mycelium (DIRT: 151,109,77)
            111: 0x007C00, // Lily Pad (PLANT: 0,124,0)
            112: 0x700200, // Nether Brick (NETHER: 112,2,0)
            113: 0x700200, // Nether Brick Fence (NETHER: 112,2,0)
            114: 0x700200, // Nether Brick Stairs (NETHER: 112,2,0)
            115: 0xFF0000, // Nether Wart (FIRE: 255,0,0)
            116: 0xFF0000, // Enchantment Table (FIRE: 255,0,0)
            117: 0xA7A7A7, // Brewing Stand (METAL: 167,167,167)
            118: 0x707070, // Cauldron (STONE: 112,112,112)
            119: 0x191919, // End Portal (BLACK: 25,25,25)
            120: 0xF7E9A3, // End Portal Frame (SAND: 247,233,163)
            121: 0xF7E9A3, // End Stone (SAND: 247,233,163)
            122: 0x191919, // Dragon Egg (BLACK: 25,25,25)
            123: 0xF7E9A3, // Redstone Lamp (Off) (SAND: 247,233,163)
            124: 0xF7E9A3, // Redstone Lamp (On) (SAND: 247,233,163)
            125: 0x8F7748, // Double Oak Slab (WOOD: 143,119,72)
            126: 0x8F7748, // Oak Slab (WOOD: 143,119,72)
            127: 0x8F7748, // Cocoa (WOOD: 143,119,72)
            128: 0xF7E9A3, // Sandstone Stairs (SAND: 247,233,163)
            129: 0x00D93A, // Emerald Ore (EMERALD: 0,217,58)
            130: 0x707070, // Ender Chest (STONE: 112,112,112)
            131: 0x8F7748, // Tripwire Hook (WOOD: 143,119,72)
            132: 0x8F7748, // Tripwire (WOOD: 143,119,72)
            133: 0x00D93A, // Emerald Block (EMERALD: 0,217,58)
            134: 0x8F7748, // Spruce Stairs (WOOD: 143,119,72)
            135: 0x8F7748, // Birch Stairs (WOOD: 143,119,72)
            136: 0x8F7748, // Jungle Stairs (WOOD: 143,119,72)
        };

        this.initThreeJS();
        this.animate();
    }

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
        this.camera.position.set(20, 20, 20);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    async loadSchematic(file) {
        document.getElementById('loader').style.display = 'flex';
        document.getElementById('status').textContent = 'Loading file...';

        try {
            const nbtVar = (typeof nbt !== 'undefined') ? nbt : window.nbt;
            if (!nbtVar) throw new Error('NBT library not found. Please refresh the page.');

            const buffer = await file.arrayBuffer();
            const decompressed = pako.ungzip(new Uint8Array(buffer));

            let nbtData;
            if (typeof nbtVar.parse === 'function') {
                nbtData = await new Promise((resolve, reject) => {
                    try {
                        const result = nbtVar.parse(decompressed, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                        if (result && !nbtData) resolve(result);
                    } catch (e) {
                        try {
                            resolve(nbtVar.parse(decompressed));
                        } catch (e2) {
                            reject(e2);
                        }
                    }
                });
            } else {
                throw new Error('NBT library does not have a parse function');
            }

            const rawData = this.simplifyNBT(nbtData);
            this.parseSchematicData(rawData);
        } catch (error) {
            console.error('Error loading schematic:', error);
            document.getElementById('status').textContent = 'Error: ' + error.message;
            document.getElementById('loader').style.display = 'none';
        }
    }

    parseSchematicData(nbtData) {
        console.log('Schematic Data:', nbtData);
        const root = nbtData;
        this.width = root.Width;
        this.height = root.Height;
        this.length = root.Length;
        const blocks = root.Blocks;

        const blockArray = [];
        for (let i = 0; i < blocks.length; i++) {
            const blockId = blocks[i] & 0xFF;
            if (blockId !== 0) {
                const hexColor = this.blockColors[blockId] || 0xcccccc;
                const y = Math.floor(i / (this.width * this.length));
                const z = Math.floor((i % (this.width * this.length)) / this.width);
                const x = i % this.width;
                blockArray.push({ x, y, z, color: hexColor });
            }
        }

        this.renderBlocks(blockArray);
    }

    renderBlocks(blockArray) {
        console.log(`Generating ${blockArray.length} blocks... Sample:`, blockArray.slice(0, 3));
        document.getElementById('loader-status').textContent = `Generating ${blockArray.length} Blocks...`;

        if (this.instancedMesh) {
            this.scene.remove(this.instancedMesh);
        }

        const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
        const material = new THREE.MeshBasicMaterial();

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, blockArray.length);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        blockArray.forEach((block, index) => {
            dummy.position.set(block.x, block.y, block.z);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(index, dummy.matrix);

            color.setHex(block.color);
            this.instancedMesh.setColorAt(index, color);
        });

        this.scene.add(this.instancedMesh);

        // Add a bounding box to see if anything is there
        const helper = new THREE.BoxHelper(this.instancedMesh, 0xffff00);
        this.scene.add(helper);

        this.controls.target.set(this.width / 2, this.height / 2, this.length / 2);
        this.camera.position.set(this.width + 10, this.height + 10, this.length + 10);
        this.camera.lookAt(this.width / 2, this.height / 2, this.length / 2);
        this.controls.update();

        document.getElementById('loader').style.display = 'none';
        document.getElementById('status').textContent = `Loaded ${this.width}x${this.height}x${this.length} structure (${blockArray.length} blocks)`;
    }

    simplifyNBT(nbt) {
        if (!nbt) return nbt;

        // If it's a wrapper object with 'value', just simplify the value
        if (typeof nbt === 'object' && nbt.value !== undefined && (nbt.type !== undefined || nbt.name !== undefined)) {
            return this.simplifyNBT(nbt.value);
        }

        if (Array.isArray(nbt)) {
            return nbt.map(v => this.simplifyNBT(v));
        }

        if (typeof nbt === 'object' && nbt !== null) {
            // Check if this is a BigInt type or similar that shouldn't be iterated
            if (nbt instanceof Int8Array || nbt instanceof Int16Array || nbt instanceof Int32Array ||
                nbt instanceof Uint8Array || nbt instanceof Uint16Array || nbt instanceof Uint32Array ||
                nbt instanceof BigInt64Array || nbt instanceof BigUint64Array) {
                return nbt;
            }

            const res = {};
            for (const key in nbt) {
                res[key] = this.simplifyNBT(nbt[key]);
            }
            return res;
        }
        return nbt;
    }
}

// Initialize
const viewer = new SchematicViewer('viewer-container');

document.getElementById('file-input').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        viewer.loadSchematic(e.target.files[0]);
    }
});
