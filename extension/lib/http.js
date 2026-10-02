// Gardes communes des routes HTTP du bundle (nodecg.mount n'applique AUCUNE authentification).
//   requireLogin(nodecg) : si la connexion est activée (mot de passe, cfg/nodecg.js), refuse les non-connectés (401)
//   sameOrigin           : refuse (403) une requête envoyée par un autre site (protection CSRF des POST).
//                          Les navigateurs ajoutent seuls Sec-Fetch-Site / Origin : rien à faire côté panneaux.
const loginEnabled = (nodecg) => !!(nodecg.config && nodecg.config.login && nodecg.config.login.enabled);

const requireLogin = (nodecg, error = 'Connexion requise') => (req, res, next) => {
	if (!loginEnabled(nodecg) || req.user) return next();
	// Session perdue (ex. serveur redémarré) : NodeCG accepte encore le jeton de la régie (cookie socketToken).
	// On délègue à sa vérification, mais en répondant 401 en JSON au lieu de rediriger vers /login.
	res.redirect = () => { if (!res.headersSent) res.status(401).json({ ok: false, error }); };
	nodecg.util.authCheck(req, res, next);
};

function sameOrigin(req, res, next) {
	const site = req.get('sec-fetch-site');
	const origin = req.get('origin');
	let foreign = false;
	// Sec-Fetch-Site est posé par le navigateur et ne peut pas être falsifié par une page : on s'y fie quand il est là.
	// Sinon (vieux navigateur), on compare Origin à Host — moins fiable derrière un proxy qui réécrit Host.
	if (site) foreign = site !== 'same-origin' && site !== 'none';
	else if (origin) {
		try { foreign = new URL(origin).host !== req.get('host'); } catch { foreign = true; }
	}
	if (foreign) return res.status(403).json({ ok: false, error: 'Requête refusée : elle doit venir de la régie elle-même.' });
	next();
}

module.exports = { loginEnabled, requireLogin, sameOrigin };
