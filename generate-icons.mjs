import { readFileSync, writeFileSync } from "fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync("./client/public/icon.svg", "utf-8");

for (const size of [16, 32, 192, 512]) {
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
    const png = resvg.render().asPng();
    writeFileSync(`./client/public/icon-${size}.png`, png);
    console.log(`icon-${size}.png`);
}

// favicon 32x32 → favicon.ico (просто PNG переименованный, браузеры принимают)
const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 32 } });
writeFileSync("./client/public/favicon.png", resvg.render().asPng());
console.log("favicon.png");
