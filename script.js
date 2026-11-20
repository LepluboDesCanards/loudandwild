/* ==========================================================================
   Loud & Wild 2027 — script commun aux 4 pages
   1. Préférences d'accessibilité (contraste, taille, animations)
   2. Navigation : page courante
   3. Programmation : filtres par créneau + fiches techniques
   4. Billetterie : choix du tarif
   5. Billetterie : validation du formulaire de pré-réservation
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var STORAGE_KEY = "lw-a11y";

  /* ---------------------------------------------------------------------
     1. Préférences d'accessibilité (mémorisées dans le navigateur)
     ------------------------------------------------------------------ */
  function lirePreferences() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (erreur) {
      return {};
    }
  }

  var prefs = { hc: false, size: 0, freeze: false };
  var sauvegardees = lirePreferences();
  if (typeof sauvegardees.hc === "boolean") prefs.hc = sauvegardees.hc;
  if (typeof sauvegardees.size === "number") prefs.size = sauvegardees.size;
  if (typeof sauvegardees.freeze === "boolean") prefs.freeze = sauvegardees.freeze;

  function appliquerPreferences() {
    html.classList.toggle("hc", prefs.hc);
    html.classList.toggle("freeze", prefs.freeze);
    html.classList.remove("fs-1", "fs-2");
    if (prefs.size > 0) html.classList.add("fs-" + prefs.size);

    var contraste = document.getElementById("toggle-contrast");
    if (contraste) contraste.setAttribute("aria-pressed", String(prefs.hc));

    var animations = document.getElementById("toggle-freeze");
    if (animations) animations.setAttribute("aria-pressed", String(prefs.freeze));

    var tailles = document.querySelectorAll("[data-size]");
    for (var i = 0; i < tailles.length; i++) {
      tailles[i].setAttribute(
        "aria-pressed",
        String(Number(tailles[i].getAttribute("data-size")) === prefs.size)
      );
    }
  }

  function enregistrerPreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (erreur) {
      /* stockage indisponible : les préférences restent valables pour la page */
    }
  }

  appliquerPreferences();

  var btnContraste = document.getElementById("toggle-contrast");
  if (btnContraste) {
    btnContraste.addEventListener("click", function () {
      prefs.hc = !prefs.hc;
      appliquerPreferences();
      enregistrerPreferences();
    });
  }

  var btnAnimations = document.getElementById("toggle-freeze");
  if (btnAnimations) {
    btnAnimations.addEventListener("click", function () {
      prefs.freeze = !prefs.freeze;
      appliquerPreferences();
      enregistrerPreferences();
    });
  }

  var boutonsTaille = document.querySelectorAll("[data-size]");
  for (var b = 0; b < boutonsTaille.length; b++) {
    boutonsTaille[b].addEventListener("click", function (evenement) {
      prefs.size = Number(evenement.currentTarget.getAttribute("data-size"));
      appliquerPreferences();
      enregistrerPreferences();
    });
  }

  /* ---------------------------------------------------------------------
     2. Navigation : marque la page courante
     ------------------------------------------------------------------ */
  var page = window.location.pathname.split("/").pop() || "accueil.html";
  var liens = document.querySelectorAll(".nav a");
  for (var l = 0; l < liens.length; l++) {
    var cible = liens[l].getAttribute("href");
    if (cible === page) liens[l].setAttribute("aria-current", "page");
    else liens[l].removeAttribute("aria-current");
  }

  /* ---------------------------------------------------------------------
     3. Programmation : filtres par créneau
     ------------------------------------------------------------------ */
  var filtres = document.querySelectorAll("[data-filter]");
  var groupes = document.querySelectorAll("[data-slot]");

  function filtrer(creneau) {
    for (var g = 0; g < groupes.length; g++) {
      var correspond = creneau === "all" || groupes[g].getAttribute("data-slot") === creneau;
      groupes[g].hidden = !correspond;
    }
    for (var f = 0; f < filtres.length; f++) {
      filtres[f].setAttribute(
        "aria-pressed",
        String(filtres[f].getAttribute("data-filter") === creneau)
      );
    }
  }

  for (var i = 0; i < filtres.length; i++) {
    filtres[i].addEventListener("click", function (evenement) {
      filtrer(evenement.currentTarget.getAttribute("data-filter"));
    });
  }

  /* Programmation : ouverture / fermeture des fiches techniques */
  var boutonsFiche = document.querySelectorAll("[data-fiche]");
  for (var k = 0; k < boutonsFiche.length; k++) {
    boutonsFiche[k].addEventListener("click", function (evenement) {
      var bouton = evenement.currentTarget;
      var panneau = document.getElementById(bouton.getAttribute("aria-controls"));
      var ouvert = bouton.getAttribute("aria-expanded") === "true";
      bouton.setAttribute("aria-expanded", String(!ouvert));
      if (panneau) panneau.hidden = ouvert;
    });
  }

  /* ---------------------------------------------------------------------
     4. Billetterie : choix du tarif
     ------------------------------------------------------------------ */
  var choixTarif = document.querySelectorAll("[data-tariff]");
  var champFormule = document.getElementById("formula");

  for (var t = 0; t < choixTarif.length; t++) {
    choixTarif[t].addEventListener("click", function (evenement) {
      var id = evenement.currentTarget.getAttribute("data-tariff");
      for (var c = 0; c < choixTarif.length; c++) {
        choixTarif[c].setAttribute("aria-pressed", String(choixTarif[c].getAttribute("data-tariff") === id));
      }
      if (champFormule) champFormule.value = id;
      var formulaire = document.getElementById("reservation");
      if (formulaire) formulaire.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------------------------------------------------------------------
     5. Billetterie : validation du formulaire (simulation, sans paiement)
     ------------------------------------------------------------------ */
  var formulaire = document.getElementById("resa-form");
  if (formulaire) {
    formulaire.addEventListener("submit", function (evenement) {
      evenement.preventDefault();

      var nom = formulaire.elements.nom.value.trim();
      var email = formulaire.elements.email.value.trim();
      var places = Number(formulaire.elements.places.value);

      var erreurs = {};

      if (nom === "") {
        erreurs.nom = "Veuillez saisir votre nom et prénom.";
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        erreurs.email = "Format attendu : nom@domaine.fr";
      }
      if (!(places >= 1 && places <= 10)) {
        erreurs.places = "Entre 1 et 10 places.";
      }

      var champs = ["nom", "email", "places"];
      for (var n = 0; n < champs.length; n++) {
        var champ = champs[n];
        var message = document.getElementById(champ + "-erreur");
        var saisie = document.getElementById(champ);
        if (erreurs[champ]) {
          if (message) {
            message.textContent = erreurs[champ];
            message.hidden = false;
          }
          if (saisie) saisie.setAttribute("aria-invalid", "true");
        } else {
          if (message) {
            message.textContent = "";
            message.hidden = true;
          }
          if (saisie) saisie.removeAttribute("aria-invalid");
        }
      }

      var confirmation = document.getElementById("confirmation");
      var aucunPaiement = document.getElementById("aucun-paiement");

      if (Object.keys(erreurs).length > 0) {
        if (confirmation) confirmation.hidden = true;
        return;
      }

      if (confirmation) {
        confirmation.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' +
          "<span>Merci " + nom + " ! Votre pré-réservation de " + places +
          " place(s) est confirmée à l'écran.</span>";
        confirmation.hidden = false;
      }
      if (aucunPaiement) {
        aucunPaiement.textContent =
          "Simulation : aucune donnée n'est enregistrée et aucun paiement n'est débité.";
      }
    });
  }
})();
