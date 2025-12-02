// nodes/TaskNode.js
import { NodeDefinition } from './NodeDefinition.js';
import { CONFIG } from '../config.js'; 
import { SourceHandlerDefinition } from '../handlers/SourceHandler.js';
import { TargetVerticalHandlerDefinition } from '../handlers/TargetVerticalHandler.js';

export class TaskNodeDefinition extends NodeDefinition {
    constructor(x, y, label, note, data) {
        super(x, y, label, note, data);
        this.type = 'task';
        this.width = 192;
        this.height = 96;
        this.handlers.push(new TargetVerticalHandlerDefinition(0, this.height/2));
        this.handlers.push(new SourceHandlerDefinition(this.width, this.height/2));
    }
    static hasTargetHandlers() { return true; }

    static getIconPath() { return `M2201 2407 c-6 -8 -12 -74 -13 -165 l-3 -151 -245 -4 c-277 -4 -337
-15 -471 -83 -132 -66 -289 -245 -389 -444 -18 -36 -77 -163 -131 -283 -110
-246 -162 -340 -228 -410 -94 -101 -153 -117 -419 -117 -133 0 -192 -4 -200
-12 -8 -8 -12 -62 -12 -175 l0 -163 25 -16 c23 -15 51 -16 243 -11 250 6 323
20 452 87 91 48 215 168 292 285 53 81 145 262 213 420 166 384 257 502 413
534 29 6 145 11 257 11 l205 0 0 -160 c0 -150 1 -160 21 -170 11 -6 24 -10 29
-8 22 7 520 512 520 527 0 8 -114 129 -253 268 -251 252 -278 273 -306 240z
M107 2075 c-15 -14 -17 -40 -17 -179 0 -119 3 -166 13 -174 7 -6 99
-12 227 -14 211 -3 216 -3 275 -31 33 -15 79 -47 103 -70 46 -44 120 -156 147
-221 18 -42 25 -40 45 14 21 54 139 291 162 322 l19 28 -21 28 c-41 52 -145
155 -188 184 -23 16 -70 42 -105 58 -116 54 -163 62 -413 67 -207 5 -232 4
-247 -12z m573 -63 c36 -12 94 -38 130 -59 74 -43 210 -174 210 -202 0 -11
-16 -48 -36 -82 -19 -35 -51 -96 -69 -136 -19 -40 -38 -73 -43 -73 -6 0 -22
20 -36 45 -58 98 -122 162 -203 202 l-77 38 -210 5 -211 5 -3 129 c-1 72 0
136 3 144 4 11 47 13 242 10 211 -4 245 -7 303 -26zM1370 1053 c-30 -74 -115 -245 -146 -294 -13 -21 -24 -46 -24 -55 0
-8 44 -59 98 -113 81 -82 111 -105 182 -140 127 -62 202 -74 477 -75 l233 -1
0 -156 c0 -169 6 -187 52 -175 33 8 518 497 518 521 0 21 -500 525 -521 525
-5 0 -19 -5 -30 -10 -18 -10 -19 -23 -19 -171 l0 -161 -232 4 c-216 3 -237 5
-282 26 -28 12 -65 34 -84 48 -44 34 -115 131 -158 217 -19 37 -36 67 -37 67
-2 0 -14 -26 -27 -57z m1113 -251 c125 -125 227 -232 227 -237 0 -14 -453
-465 -466 -465 -9 0 -13 38 -16 135 -4 190 14 178 -270 181 -300 3 -403 24
-530 112 -44 30 -155 139 -171 168 -7 12 10 55 63 160 40 79 76 144 80 144 4
0 27 -29 50 -65 80 -122 161 -186 269 -211 36 -9 125 -14 253 -14 194 0 197 0
225 24 28 24 28 25 31 160 3 97 7 136 16 136 6 0 114 -103 239 -228z`; }

    getShapePath() {
        return 'M32 0 176 0A16 16 90 01192 16L192 28A20 20 90 00192 68L192 80A16 16 90 01176 96L16 96A16 16 90 010 80L0 68 12 68 12 28 0 28 0 16A16 16 90 0116 0Z';
        const W = CONFIG.node.width;
        const H = CONFIG.node.height;
        const sR = CONFIG.node.smallBorderRadius;
        const sourceHandler =  H/2 - (SourceHandlerDefinition.getDimension(this.handlers[1]).radius + CONFIG.handler.margin);
        const targetHandlerWidth =  TargetVerticalHandlerDefinition.getDimension(this.handlers[0]).width/2 + CONFIG.handler.margin;
        const targetHandlerHeightUp =  H/2 - TargetVerticalHandlerDefinition.getDimension(this.handlers[0]).height/2 - CONFIG.handler.margin;
        const targetHandlerHeightDown =  H/2 + TargetVerticalHandlerDefinition.getDimension(this.handlers[0]).height/2 + CONFIG.handler.margin;

        return `
            M ${sR},0
            L ${W - sR},0
            A ${sR},${sR} 0 0 1 ${W},${sR}
            L ${W},${sourceHandler}
            A 1,1 0 0 0 ${W},${H - sourceHandler}
            L ${W},${H - sR}
            A ${sR},${sR} 0 0 1 ${W - sR},${H}
            L ${sR},${H}
            A ${sR},${sR} 0 0 1 0,${H - sR}
            L 0,${targetHandlerHeightDown}
            L ${targetHandlerWidth},${targetHandlerHeightDown}
            L ${targetHandlerWidth},${targetHandlerHeightUp}
            L 0,${targetHandlerHeightUp}
            L 0,${sR}
            A ${sR},${sR} 0 0 1 ${sR},0
            Z
        `.replace(/\s+/g, ' ');
    }
}