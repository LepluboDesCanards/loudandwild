/* ==========================================================================
   Loud & Wild 2027 — script commun aux 4 pages
   1. Préférences d'accessibilité (contraste, taille, animations)
   2. Navigation : page courante
   3. Programmation : filtres par créneau + fiches techniques
   4. Billetterie : quantités par tarif et validation de la pré-réservation
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
     4. Billetterie : sélectionner une quantité pour chaque tarif
     ------------------------------------------------------------------ */
  var tarifs = [
    { id: "reduit", nom: "Tarif Réduit", prix: 10 },
    { id: "standard", nom: "Pass Soirée Standard", prix: 15 },
    { id: "jetons", nom: "Pass + Pack Jetons", prix: 22 }
  ];
  var cartesTarif = document.querySelectorAll("[data-tariff]");
  var formulaireReservation = document.getElementById("resa-form");
  var quantites = {};
  var tarifTotal = 0;
  var totalPlaces = 0;
  var resumeCommande = null;
  var erreurQuantites = null;

  if (formulaireReservation && cartesTarif.length) {
    var champPlaces = formulaireReservation.elements.places;
    var ligneAncienneFormule = document.querySelector("#formula");
    var blocAncienneFormule = ligneAncienneFormule && ligneAncienneFormule.closest(".field-row");
    if (blocAncienneFormule) blocAncienneFormule.hidden = true;

    resumeCommande = document.createElement("div");
    resumeCommande.className = "fiche ticket-summary";
    resumeCommande.setAttribute("aria-live", "polite");
    resumeCommande.setAttribute("aria-atomic", "true");
    resumeCommande.textContent = "Votre commande : sélectionnez une quantité pour chaque tarif. Maximum 10 places.";
    formulaireReservation.insertBefore(resumeCommande, formulaireReservation.querySelector(".pmr-check"));

    erreurQuantites = document.createElement("p");
    erreurQuantites.className = "error";
    erreurQuantites.id = "quantites-erreur";
    erreurQuantites.setAttribute("role", "alert");
    erreurQuantites.hidden = true;
    resumeCommande.insertAdjacentElement("afterend", erreurQuantites);

    /* Le champ précédent était à l'intérieur du bloc masqué : déplacer son erreur. */
    var erreurPlaces = document.getElementById("places-erreur");
    if (erreurPlaces) erreurPlaces.insertAdjacentElement("afterend", document.createElement("span"));
    if (erreurPlaces && erreurPlaces.nextElementSibling) erreurPlaces.nextElementSibling.remove();
    if (erreurPlaces) erreurPlaces.remove();

    function afficherCommande() {
      var descriptions = [];
      totalPlaces = 0;
      tarifTotal = 0;

      for (var q = 0; q < tarifs.length; q++) {
        var tarif = tarifs[q];
        var quantite = quantites[tarif.id] ? Number(quantites[tarif.id].value) : 0;
        totalPlaces += quantite;
        tarifTotal += quantite * tarif.prix;
        if (quantite > 0) {
          descriptions.push(quantite + " × " + tarif.nom + " (" + (quantite * tarif.prix) + " €)");
        }
      }

      if (champPlaces) champPlaces.value = String(totalPlaces);
      resumeCommande.textContent = descriptions.length
        ? "Votre commande : " + descriptions.join(" · ") + " — " + totalPlaces +
          " place(s), total : " + tarifTotal + " €."
        : "Votre commande : sélectionnez une quantité pour chaque tarif. Maximum 10 places.";
    }

    function actualiserMaximums() {
      var total = 0;
      for (var q = 0; q < tarifs.length; q++) {
        total += Number(quantites[tarifs[q].id].value) || 0;
      }
      for (var m = 0; m < tarifs.length; m++) {
        var input = quantites[tarifs[m].id];
        var autres = total - (Number(input.value) || 0);
        input.max = String(Math.max(0, 10 - autres));
      }
    }

    for (var t = 0; t < tarifs.length; t++) {
      (function (tarif) {
        var bouton = document.querySelector('[data-tariff="' + tarif.id + '"]');
        if (!bouton) return;

        var champ = document.createElement("div");
        champ.className = "field tariff-quantity";
        var label = document.createElement("label");
        var idChamp = "quantite-" + tarif.id;
        label.setAttribute("for", idChamp);
        label.textContent = "Quantité — " + tarif.nom + " (" + tarif.prix + " €)";

        var input = document.createElement("input");
        input.type = "number";
        input.id = idChamp;
        input.name = idChamp;
        input.min = "0";
        input.max = "10";
        input.step = "1";
        input.value = "0";
        input.setAttribute("inputmode", "numeric");
        input.setAttribute("aria-describedby", "quantites-erreur");
        quantites[tarif.id] = input;

        champ.appendChild(label);
        champ.appendChild(input);
        bouton.replaceWith(champ);

        input.addEventListener("input", function () {
          var valeur = Number(input.value);
          if (!Number.isFinite(valeur) || valeur < 0) valeur = 0;
          valeur = Math.floor(valeur);
          var maximum = Number(input.max);
          if (valeur > maximum) valeur = maximum;
          input.value = String(valeur);
          actualiserMaximums();
          afficherCommande();
          if (erreurQuantites) {
            erreurQuantites.hidden = true;
            erreurQuantites.textContent = "";
          }
        });
      })(tarifs[t]);
    }
    afficherCommande();
  }

  /* ---------------------------------------------------------------------
     5. Billetterie : validation de la pré-réservation (simulation, sans paiement)
     ------------------------------------------------------------------ */
  var formulaire = document.getElementById("resa-form");
  if (formulaire) {
    formulaire.addEventListener("submit", function (evenement) {
      evenement.preventDefault();

      var nom = formulaire.elements.nom.value.trim();
      var email = formulaire.elements.email.value.trim();
      var places = Number(formulaire.elements.places.value);
      var erreurs = {};

      if (nom === "") erreurs.nom = "Veuillez saisir votre nom et prénom.";
      if (!/^\S+@\S+\.\S+$/.test(email)) erreurs.email = "Format attendu : nom@domaine.fr";
      if (!(places >= 1 && places <= 10)) {
        erreurs.quantites = places === 0
          ? "Sélectionnez au moins une place."
          : "La commande doit contenir entre 1 et 10 places au total.";
      }

      var champs = ["nom", "email"];
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

      if (erreurQuantites) {
        erreurQuantites.textContent = erreurs.quantites || "";
        erreurQuantites.hidden = !erreurs.quantites;
      }
      for (var v = 0; v < tarifs.length; v++) {
        if (quantites[tarifs[v].id]) {
          if (erreurs.quantites) quantites[tarifs[v].id].setAttribute("aria-invalid", "true");
          else quantites[tarifs[v].id].removeAttribute("aria-invalid");
        }
      }

      var confirmation = document.getElementById("confirmation");
      var aucunPaiement = document.getElementById("aucun-paiement");
      if (Object.keys(erreurs).length > 0) {
        if (confirmation) confirmation.hidden = true;
        return;
      }

      var detailsCommande = [];
      for (var d = 0; d < tarifs.length; d++) {
        var tarif = tarifs[d];
        var nombre = Number(quantites[tarif.id].value) || 0;
        if (nombre > 0) detailsCommande.push(nombre + " × " + tarif.nom);
      }
      if (confirmation) {
        confirmation.textContent = "Merci " + nom + " ! Votre pré-réservation de " +
          detailsCommande.join(", ") + " (" + places + " place(s), " + tarifTotal +
          " €) est confirmée à l'écran.";
        confirmation.hidden = false;
      }
      if (aucunPaiement) {
        aucunPaiement.textContent =
          "Simulation : aucune donnée n'est enregistrée et aucun paiement n'est débité.";
      }
    });
  }
})();
