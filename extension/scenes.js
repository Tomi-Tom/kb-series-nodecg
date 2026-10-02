// Logique serveur : scenes (écrans plein écran hors-jeu : starting, brb, ending, schedule)
// Replicants propres à cette partie : `scenesTexts` (textes) et `scenesRotation` (rotation de l'écran Pause),
// défauts dans shared/scenes.js. Le compte à rebours est le replicant coeur `countdown` (extension/state.js).
const { DEFAULT_TEXTS, DEFAULT_ROTATION } = require('../shared/scenes.js');

const clone = (v) => JSON.parse(JSON.stringify(v));

module.exports = function (nodecg) {
	nodecg.Replicant('scenesTexts', { defaultValue: clone(DEFAULT_TEXTS) });
	nodecg.Replicant('scenesRotation', { defaultValue: clone(DEFAULT_ROTATION) });
};
