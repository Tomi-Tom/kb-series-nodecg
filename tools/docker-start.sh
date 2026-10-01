#!/bin/sh
# Démarrage en conteneur : les données (base NodeCG, sauvegardes, logos/photos envoyés)
# sont rangées dans $DATA_DIR (un seul volume persistant, compatible Railway).
set -e
if [ -n "$DATA_DIR" ]; then
	mkdir -p "$DATA_DIR/db" "$DATA_DIR/assets"
	for d in db assets; do
		if [ ! -L "/app/$d" ]; then rm -rf "/app/$d"; ln -s "$DATA_DIR/$d" "/app/$d"; fi
	done
fi
exec node node_modules/nodecg/index.js
