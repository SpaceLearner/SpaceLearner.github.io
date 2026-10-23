// Select once at startup: rotating the device never downloads a second atlas.
import { quality } from './quality-profile.js?v=72ab348954d7850d';
const compact=quality.textureTier==='compact';
const variants=new Map([
  ['irradiance-rgbm.webp','irradiance-rgbm.webp'],
  ['solar-irradiance-rgbm.webp','solar-irradiance-rgbm.webp'],
  ['ai-walnut-desktop-v1.png','ai-walnut-desktop-v1.jpg'],
  ['nasa-earth-surface.jpg','nasa-earth-surface.jpg'],
  ['nasa-earth-clouds.jpg','nasa-earth-clouds.jpg']
]);
export function textureAsset(file){if(compact&&variants.has(file))return 'mobile/'+variants.get(file);return file==='ai-walnut-desktop-v1.png'?'ai-walnut-desktop-v1.jpg':file;}
