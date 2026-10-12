# Objectius AEC · Buidatge Osona i Lluçanès

Web estàtica per introduir i buidar els acords de les assemblees de centre. Inclou nou eixos, 150 objectius, el cens de 157 centres, prioritats ordenades o sense ordre, esmenes i importació/exportació CSV i JSON i importació Excel .xlsx.

## On es desen els resultats

Les dades es desen exclusivament al navegador amb `localStorage`. No s’envien a GitHub ni formen part del repositori. Cada centre té una fitxa vigent. Els esborranys i els eixos pendents no compten al buidatge; els objectius sense ordre compten al suport, però no a l’ordre mitjà.

Descarrega una còpia JSON periòdicament i abans de canviar de dispositiu o esborrar les dades del navegador. Per traslladar resultats des de la versió anterior, exporta’ls en JSON o CSV i importa’ls en aquesta web.

## Importació Excel

Accepta llibres .xlsx amb un full per eix, objectius a la columna A i marques X/x a la B. Llegeix les esmenes sota «ESMENES», ignora les files «NO VOTAR» i mostra una previsualització amb centre, data, participants i eixos debatuts. Les marques es desen sense ordre de prioritat. Les files marcades desconegudes bloquegen la importació amb un avís; no es descarten silenciosament. Un punt de català de la plantilla agrupa L04 i L05: la previsualització permet revisar-ne la selecció separadament.

La lectura s’executa localment amb SheetJS CE 0.20.3, distribuït sota Apache-2.0. La biblioteca i la llicència es conserven a `vendor/` i `docs/vendor/`; no es carreguen serveis externs per processar el fitxer. No s’inclou cap Excel de resultats reals al repositori.

## Publicació a GitHub Pages

Els fitxers preparats són a `docs/`. A Settings → Pages, selecciona «Deploy from a branch», branca `main`, carpeta `/docs`. La web funciona sense servidor, sense base de dades i sense credencials al codi.

## Actualitzar el codi

Amb Node.js 22 o posterior:

```sh
npm install
npm test
npm run build
```

Publica també els fitxers actualitzats de `docs/`. No incloguis resultats reals ni còpies de seguretat al repositori.

## Fonts

- Redaccions: guió per presentar i prioritzar els objectius de l’AEC, preparat el 29/09/2026. El guió complet és a `docs/guio-objectius-aec.pdf`.
- Cens: full de centres d’Osona i el Lluçanès preparat l’01/10/2026, amb el directori del Departament del 23/03/2026 i l’adscripció comarcal revisada.
- Disseny de referència: https://prosfp.github.io/AEC_Fixar_Objectius_09-26/

Les propostes i els aclariments són material de debat; no s’inventen dades ni acords de les assemblees.
