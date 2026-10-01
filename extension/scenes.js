// Logique serveur : scenes (écrans plein écran hors-jeu : starting, brb, ending, schedule)
// Replicants propres à cette partie : `scenesTexts` (textes) et `scenesRotation` (rotation Pause) — défauts dans shared/scenes.js
const { DEFAULT_TEXTS, DEFAULT_ROTATION } = require('../shared/scenes.js');

module.exports = function (nodecg) {
	nodecg.Replicant('scenesTexts', { defaultValue: DEFAULT_TEXTS });
	// V2 : éléments du bandeau en rotation de l'écran Pause (personnalisable depuis le panneau)
	nodecg.Replicant('scenesRotation', { defaultValue: DEFAULT_ROTATION });

	// Raccourcis compte à rebours (utilisables depuis n'importe quel panneau) :
	//   nodecg.sendMessage('scenes:countdown', { minutes: 10 })  → démarre à N minutes
	//   nodecg.sendMessage('scenes:countdown', { add: 5 })       → ajoute N minutes (repart de maintenant si arrêté/terminé)
	//   nodecg.sendMessage('scenes:countdown', { reset: true })  → arrête
	const countdown = nodecg.Replicant('countdown');
	nodecg.listenFor('scenes:countdown', (data = {}, ack) => {
		const cd = { ...(countdown.value || {}) };
		const now = Date.now();
		if (data.reset) cd.endsAt = null;
		else if (typeof data.minutes === 'number') cd.endsAt = now + data.minutes * 60000;
		else if (typeof data.add === 'number') cd.endsAt = (cd.endsAt && cd.endsAt > now ? cd.endsAt : now) + data.add * 60000;
		if (typeof data.label === 'string') cd.label = data.label;
		countdown.value = cd;
		if (ack && !ack.handled) ack(null, cd);
	});
};
