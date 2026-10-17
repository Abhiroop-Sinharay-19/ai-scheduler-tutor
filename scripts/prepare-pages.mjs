import { copyFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve("dist");
const indexPath = resolve(outputDirectory, "index.html");
const notFoundPath = resolve(outputDirectory, "404.html");

await access(indexPath);
await copyFile(indexPath, notFoundPath);
console.log("Created dist/404.html for GitHub Pages client-side route refreshes.");
