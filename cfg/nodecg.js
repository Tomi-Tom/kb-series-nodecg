// Configuration NodeCG — lue au démarrage.
// En local (start.bat) : aucune variable d'environnement → pas de mot de passe, port 9090, régie joignable
// UNIQUEMENT depuis ce PC (http://localhost:9090).
// En ligne (Docker / hébergeur) : tout se règle par variables d'environnement, voir docs/DEPLOIEMENT.md
//   PORT                   port d'écoute (fourni par l'hébergeur, défaut 9090)
//   NODECG_HOST            adresse d'écoute. Défaut : 127.0.0.1 (ce PC seulement) sans mot de passe, 0.0.0.0 avec.
//                          Pour OBS ou une régie sur un autre PC du réseau : NODECG_HOST=0.0.0.0 (start-reseau.bat),
//                          de préférence avec un mot de passe : sans, tout le réseau peut piloter le stream.
//   NODECG_BASE_URL        domaine public sans https://, ex. regie.mondomaine.fr
//   NODECG_PASSWORD        mot de passe de la régie → active la connexion
//   NODECG_USER            identifiant (défaut : regie)
//   NODECG_SESSION_SECRET  longue chaîne aléatoire qui signe les sessions. Facultatif : si absent, un secret
//                          aléatoire est créé dans db/session-secret et réutilisé aux démarrages suivants.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const env = process.env;
const password = env.NODECG_PASSWORD;

if (password === 'change-moi') {
	console.error('\n[ERREUR] NODECG_PASSWORD vaut encore « change-moi » (valeur d\'exemple de .env.example).\n'
		+ '         Choisis un vrai mot de passe dans ton fichier .env (ou les variables de ton hébergeur), puis relance.\n');
	process.exit(1);
}

// En ligne (image Docker : NODE_ENV=production), une régie sans mot de passe serait ouverte à tout Internet
if (!password && env.NODE_ENV === 'production') {
	console.error('\n[ERREUR] NODECG_PASSWORD est vide : en ligne, la régie doit être protégée par un mot de passe.\n'
		+ '         Renseigne NODECG_PASSWORD (fichier .env ou variables de ton hébergeur), puis relance. Voir docs/DEPLOIEMENT.md\n');
	process.exit(1);
}

// Secret des sessions de connexion : variable d'environnement, sinon secret aléatoire gardé dans db/
function sessionSecret() {
	if (env.NODECG_SESSION_SECRET) return env.NODECG_SESSION_SECRET;
	const file = path.join(__dirname, '..', 'db', 'session-secret');
	try {
		const saved = fs.readFileSync(file, 'utf8').trim();
		if (saved.length >= 32) return saved;
	} catch { /* pas encore créé */ }
	const secret = crypto.randomBytes(48).toString('hex');
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, secret + '\n', { mode: 0o600 });
	return secret;
}

const host = env.NODECG_HOST || (password ? '0.0.0.0' : '127.0.0.1');
if (!password && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
	console.warn(`[ATTENTION] Régie ouverte au réseau (${host}) SANS mot de passe : toute personne sur le réseau peut piloter le stream.`);
}

module.exports = {
	host,
	port: Number(env.PORT) || 9090,
	...(env.NODECG_BASE_URL ? { baseURL: env.NODECG_BASE_URL } : {}),
	login: password
		? {
			enabled: true,
			sessionSecret: sessionSecret(),
			local: {
				enabled: true,
				allowedUsers: [{ username: env.NODECG_USER || 'regie', password }],
			},
		}
		: { enabled: false },
};
