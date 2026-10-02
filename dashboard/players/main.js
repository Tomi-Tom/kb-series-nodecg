// Panneau « Équipes & Joueurs » : rendu complet à chaque changement d'un replicant lu par le panneau.
// Chargé en dernier (après data.js, board.js, sheet.js, preview.js).
(function (P) {
	// P.sel n'est pas effacé quand le joueur manque : juste après un changement de Riot ID ou un import, la nouvelle
	// clé n'arrive dans les replicants qu'au retour du serveur (la fiche reste masquée tant qu'il manque).
	P.renderAll = () => {
		if (P.editTeam && P.editTeam.id !== 'new' && !KB.team(P.editTeam.id)) P.editTeam = null;
		P.renderBoard();
		P.renderSheet();
		P.renderPreview();
		P.checkArrival();
	};
	KB.watch(['teams', 'playerData', 'playerProfiles', 'valorantData', 'match', P.photoAssets, P.logoAssets, P.statsGraphic, P.duel, P.mapsGraphics], P.renderAll);
})(window.KBPlayers ||= {});
