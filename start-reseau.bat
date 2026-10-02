@echo off
rem Lance la regie en l'ouvrant aux autres appareils du reseau local (OBS ou regie sur un autre PC, tablette).
rem (fichier en ASCII volontairement : pas d'accents dans un .bat)
title KB SERIES - Regie NodeCG
cd /d "%~dp0"
if "%PORT%"=="" set "PORT=9090"

rem Sans mot de passe, toute personne sur le meme reseau peut piloter le stream.
rem Pour proteger la regie : retire "rem " devant les deux lignes ci-dessous et choisis un mot de passe.
rem set "NODECG_PASSWORD=mon-mot-de-passe"
rem set "NODECG_USER=regie"
set "NODECG_HOST=0.0.0.0"
echo.
echo   Regie ouverte au reseau local. Adresse a utiliser depuis un autre appareil :
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do for /f "tokens=*" %%b in ("%%a") do echo     http://%%b:%PORT%
if not defined NODECG_PASSWORD echo   [ATTENTION] Aucun mot de passe : a n'utiliser que sur un reseau de confiance.

where node >nul 2>nul
if errorlevel 1 (
	echo [ERREUR] Node.js est introuvable. Installe Node.js 24 LTS depuis https://nodejs.org puis relance ce fichier.
	pause
	exit /b 1
)

if not exist "node_modules\nodecg\index.js" (
	echo Premiere installation, patiente 1 a 3 minutes...
	call npm ci
	if errorlevel 1 (
		echo [ERREUR] L'installation a echoue. Verifie ta connexion internet puis relance.
		pause
		exit /b 1
	)
)

rem Port deja utilise ? Si c'est la regie, on ouvre juste le navigateur ; sinon on previent.
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if errorlevel 1 goto :demarrer
powershell -NoProfile -Command "try { $r = (New-Object Net.WebClient).DownloadString('http://127.0.0.1:%PORT%/valorant-tournament/tracker-status'); if ($r -match 'valorant-tournament') { exit 0 } } catch { }; exit 1"
if errorlevel 1 goto :port_occupe
echo La regie tourne deja : ouverture du navigateur.
if not defined KB_NO_BROWSER start "" http://localhost:%PORT%
exit /b 0

:port_occupe
echo [ERREUR] Le port %PORT% est deja utilise par un autre programme.
echo          Ferme ce programme, ou choisis un autre port (voir docs\DEPANNAGE.md).
pause
exit /b 1

:demarrer
rem Ouvre le navigateur seulement quand le serveur repond (90 s max)
if not defined KB_NO_BROWSER start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 90;$i++){try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',%PORT%);$c.Close();Start-Process 'http://localhost:%PORT%';break}catch{Start-Sleep 1}}"

echo.
echo   Regie KB SERIES : http://localhost:%PORT%
echo   Ferme cette fenetre pour arreter le serveur.
echo.
call npm start
echo.
echo Le serveur s'est arrete.
pause
