// Configuration NodeCG — lue au démarrage.
// En local (start.bat) : aucune variable d'environnement → pas de mot de passe, port 9090.
// En ligne (Docker / hébergeur) : tout se règle par variables d'environnement, voir docs/DEPLOIEMENT.md
//   PORT                   port d'écoute (fourni par l'hébergeur, défaut 9090)
//   NODECG_BASE_URL        domaine public sans https://, ex. regie.mondomaine.fr
//   NODECG_PASSWORD        mot de passe de la régie → active la connexion
//   NODECG_USER            identifiant (défaut : regie)
//   NODECG_SESSION_SECRET  longue chaîne aléatoire (obligatoire si mot de passe)
const env = process.env;
const password = env.NODECG_PASSWORD;

module.exports = {
	host: '0.0.0.0',
	port: Number(env.PORT) || 9090,
	...(env.NODECG_BASE_URL ? { baseURL: env.NODECG_BASE_URL } : {}),
	login: password
		? {
			enabled: true,
			sessionSecret: env.NODECG_SESSION_SECRET || password + '-kb-series-session',
			forceHttpsReturn: true,
			local: {
				enabled: true,
				allowedUsers: [{ username: env.NODECG_USER || 'regie', password }],
			},
		}
		: { enabled: false },
};
