// Select once at startup: rotating the device never downloads a second atlas.
const compact=typeof matchMedia==='function'&&matchMedia('(max-width:600px)').matches;
const variants=new Map([
  ['irradiance-rgbm.png','irradiance-rgbm.png'],
  ['solar-irradiance-rgbm.png','solar-irradiance-rgbm.png'],
  ['ai-walnut-desktop-v1.png','ai-walnut-desktop-v1.jpg'],
  ['nasa-earth-surface.jpg','nasa-earth-surface.jpg'],
  ['nasa-earth-clouds.jpg','nasa-earth-clouds.jpg']
]);
export function textureAsset(file){return compact&&variants.has(file)?'mobile/'+variants.get(file):file;}
