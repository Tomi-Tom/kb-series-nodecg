// Génère les icônes PNG de l'extension (thème KB SERIES). Usage : node tools/tracker-extension/make-icons.js
const path = require('path');
const sharp = require('sharp');

const svg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 128 128">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2366"/><stop offset="1" stop-color="#0a0f2e"/></linearGradient>
		<linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fc1ff"/><stop offset="1" stop-color="#3b8fe6"/></linearGradient>
	</defs>
	<!-- carré à coins coupés (langage Valorant) + filet doré -->
	<path d="M24 4 H124 V104 L104 124 H4 V24 Z" fill="url(#bg)" stroke="#c9b274" stroke-width="${s <= 16 ? 10 : 7}"/>
	<!-- flèche d'envoi -->
	<path d="M64 22 L98 58 H76 V84 H52 V58 H30 Z" fill="url(#ar)"/>
	<rect x="30" y="94" width="68" height="${s <= 16 ? 14 : 10}" fill="#c9b274"/>
</svg>`;

(async () => {
	for (const s of [16, 32, 48, 128]) {
		await sharp(Buffer.from(svg(s))).resize(s, s).png().toFile(path.join(__dirname, 'icons', `icon-${s}.png`));
	}
	console.log('Icônes générées dans', path.join(__dirname, 'icons'));
})();
