import { mkdir, copyFile, cp, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist/site", { recursive: true });
await mkdir("dist/max-volume-commerce/storefront", { recursive: true });
await cp("commerce", "dist/max-volume-commerce", { recursive: true });
for (const file of ["index.html", "style.css", "app.js", "policies.html"]) {
  await copyFile(file, `dist/site/${file}`);
  await copyFile(file, `dist/max-volume-commerce/storefront/${file}`);
}
await copyFile("robots.txt", "dist/site/robots.txt");
console.log("Built static site and installable WordPress plugin directory.");
