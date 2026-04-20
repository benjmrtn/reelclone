# PRD.md — ReelClone
## Product Requirements Document v1.0

---

## 1. Vision produit

**ReelClone** est un outil local permettant aux OFM managers de cloner la structure visuelle d'une vidéo TikTok ou Instagram Reel performante, puis d'y substituer leur propre vidéo de modèle — en conservant le timing, les textes overlay, les transitions et l'audio original.

**Problème résolu** : Un OFM manager voit un format qui cartonne. Le recréer manuellement prend 20-40 minutes. ReelClone réduit ça à 3-5 minutes.

**Utilisateur cible** : OFM manager, 1 à 10 modèles sous gestion, produit 3-10 vidéos/jour par modèle.

**Modèle économique** : Outil à usage personnel. L'user fournit sa propre clé API Anthropic (coût ~0.003$/vidéo).

---

## 2. User Stories

### Story 1 — Extraction de template
> En tant qu'OFM manager, je peux uploader une vidéo TikTok/Reel que j'ai téléchargée, et obtenir une analyse automatique de sa structure (cuts, textes, timing, audio) pour pouvoir la réutiliser.

**Critères d'acceptance :**
- Upload accepté : MP4, MOV, WebM, max 500MB, max 3 min
- Extraction en moins de 60 secondes pour une vidéo de 30s
- Le template extrait est affiché visuellement (timeline + aperçu des overlays)
- L'utilisateur peut modifier manuellement chaque élément du template avant de continuer

### Story 2 — Composition avec nouvelle vidéo
> En tant qu'OFM manager, je peux uploader ma vidéo de modèle et la voir appliquée automatiquement sur le template extrait, avec les mêmes timings et textes.

**Critères d'acceptance :**
- Upload de la vidéo modèle en MP4/MOV
- Crop automatique en 9:16 si besoin (crop centré)
- Aperçu du résultat avant export final
- Option de garder l'audio original ou de le couper

### Story 3 — Export
> En tant qu'OFM manager, je peux exporter la vidéo finale en MP4 prête à être postée, sans watermark, en 1080x1920.

**Critères d'acceptance :**
- Export MP4 H.264, 1080x1920, 30fps
- Pas de watermark ReelClone
- Téléchargement direct depuis l'interface
- Fichier nommé : `reelclone_{timestamp}.mp4`

### Story 4 — Gestion de la clé API
> En tant qu'utilisateur, je saisis ma clé API Anthropic une seule fois par session, elle n'est jamais sauvegardée sur disque.

**Critères d'acceptance :**
- Champ masqué (type password)
- Stockée uniquement en mémoire session (pas localStorage, pas fichier)
- Validation immédiate de la clé avant de permettre l'extraction
- Message clair si la clé est invalide ou épuisée

---

## 3. Flows utilisateur

### Flow principal

```
[1. ACCUEIL]
  └─ Saisie clé API Anthropic
  └─ Upload vidéo source (TikTok/Reel à cloner)
        ↓
[2. EXTRACTION]
  └─ Analyse automatique (FFmpeg + OCR + Claude Vision)
  └─ Affichage du template extrait :
       - Timeline avec cuts visualisés
       - Liste des textes overlay détectés (texte + timing + position)
       - Piste audio détectée (oui/non)
       - Style visuel analysé
  └─ Éditeur manuel pour ajuster/corriger
        ↓
[3. COMPOSITION]
  └─ Upload vidéo modèle
  └─ Aperçu du crop 9:16 automatique
  └─ Option : garder audio original / couper le son
  └─ Lancement du rendu
        ↓
[4. EXPORT]
  └─ Aperçu vidéo finale (player intégré)
  └─ Bouton téléchargement MP4
  └─ Option : recommencer avec une autre vidéo modèle (même template)
```

---

## 4. Architecture technique

### Backend (Python + FastAPI)

```
backend/
├── main.py
├── extractor/
│   ├── cuts.py          # Détection scènes via FFmpeg
│   ├── ocr.py           # Extraction texte via Tesseract + OpenCV
│   ├── audio.py         # Extraction/séparation audio
│   └── analyzer.py      # Analyse IA frames via Claude Vision
├── composer/
│   ├── template.py      # Dataclass Template
│   ├── renderer.py      # Rendu final via FFmpeg
│   └── overlay.py       # Application des textes overlay
├── utils/
│   ├── ffmpeg_check.py
│   ├── session.py
│   └── validators.py
└── requirements.txt
```

**Dépendances Python :**
```
fastapi>=0.110.0
uvicorn>=0.27.0
python-multipart>=0.0.9
ffmpeg-python>=0.2.0
pytesseract>=0.3.10
opencv-python>=4.9.0
Pillow>=10.2.0
anthropic>=0.21.0
python-dotenv>=1.0.0
aiofiles>=23.2.1
```

### Frontend (Next.js 14 + TypeScript)

```
frontend/
├── app/
│   ├── page.tsx             # Étape 1 : Upload source
│   ├── review/page.tsx      # Étape 2 : Revue template
│   ├── compose/page.tsx     # Étape 3 : Upload modèle
│   └── export/page.tsx      # Étape 4 : Export
├── components/
│   ├── ApiKeyInput.tsx
│   ├── VideoUpload.tsx
│   ├── TemplatePreview.tsx
│   ├── TimelineEditor.tsx
│   ├── OverlayEditor.tsx
│   ├── VideoPlayer.tsx
│   └── ExportButton.tsx
└── lib/
    ├── api.ts
    └── types.ts
```

---

## 5. API Backend — Endpoints détaillés

### POST `/api/extract`
**Description** : Upload la vidéo source et lance l'extraction complète.

**Request** :
```
Content-Type: multipart/form-data
Fields:
  - video: File (MP4/MOV/WebM)
  - api_key: string (clé Anthropic)
```

**Response** :
```json
{
  "session_id": "uuid-v4",
  "status": "processing",
  "estimated_seconds": 45
}
```

### GET `/api/status/{session_id}`
**Description** : Polling du statut d'extraction ou de rendu.

**Response** :
```json
{
  "session_id": "uuid-v4",
  "status": "processing" | "ready" | "error",
  "progress": 67,
  "step": "ocr" | "cuts" | "analysis" | "rendering",
  "error": null
}
```

### GET `/api/template/{session_id}`
**Description** : Récupère le template extrait.

**Response** :
```json
{
  "session_id": "uuid-v4",
  "duration": 28.4,
  "cuts": [
    {"start": 0.0, "end": 3.2, "type": "cut"},
    {"start": 3.2, "end": 8.7, "type": "cut"}
  ],
  "overlays": [
    {
      "id": "ov_1",
      "text": "tu savais ça sur moi ?",
      "x": 0.1, "y": 0.75,
      "width": 0.8, "height": 0.12,
      "start": 0.5, "end": 3.0,
      "style": {"color": "white", "fontSize": 48, "hasBorder": true}
    }
  ],
  "audio": {
    "detected": true,
    "path": "audio.aac",
    "duration": 28.4
  },
  "visual_style": {
    "brightness": "dark",
    "saturation": "high",
    "dominant_text_position": "bottom"
  }
}
```

### PUT `/api/template/{session_id}`
**Description** : Sauvegarde les modifications manuelles du template.

**Request** : Même format que la response GET ci-dessus.

### POST `/api/compose/{session_id}`
**Description** : Upload la vidéo modèle et lance le rendu.

**Request** :
```
Content-Type: multipart/form-data
Fields:
  - video: File (MP4/MOV)
  - keep_audio: boolean (default: true)
  - api_key: string
```

**Response** :
```json
{
  "session_id": "uuid-v4",
  "status": "rendering",
  "estimated_seconds": 30
}
```

### GET `/api/export/{session_id}`
**Description** : Télécharge la vidéo finale.

**Response** : `video/mp4` binary stream

### DELETE `/api/session/{session_id}`
**Description** : Nettoie les fichiers temporaires de la session.

---

## 6. Design UI/UX

### Principes
- Interface sombre (dark theme) — contexte OFM, usage nocturne fréquent
- Stepper horizontal en haut (4 étapes) — toujours visible
- Pas de compte, pas de login, pas de sauvegarde cloud
- Feedback de progression en temps réel (polling toutes les 2s)
- Mobile responsive mais usage desktop prioritaire

### Palette
```css
--bg-primary: #0a0a0a;
--bg-surface: #141414;
--bg-elevated: #1e1e1e;
--accent: #6366f1;        /* Indigo */
--accent-hover: #4f46e5;
--text-primary: #f5f5f5;
--text-secondary: #a3a3a3;
--border: #2a2a2a;
--success: #22c55e;
--error: #ef4444;
--warning: #f59e0b;
```

### Typographie
- Display : `Syne` (Google Fonts) — titres et steps
- Body : `DM Sans` — textes courants
- Mono : `JetBrains Mono` — timestamps, données techniques

### Composants clés

#### TimelineEditor
- Barre horizontale représentant la durée totale
- Segments colorés pour chaque cut
- Overlays représentés en couche au-dessus (blocs translucides)
- Drag pour déplacer, resize pour ajuster la durée
- Click sur un overlay → édition du texte inline

#### TemplatePreview
- Miniature 9:16 avec les overlays à leur position
- Play button pour simuler le timing (highlight de l'overlay actif)
- Mode "before/after" pour comparer source vs composition

---

## 7. Roadmap MVP

### Phase 1 — Core (Semaine 1-2)
- [ ] Setup FastAPI + structure dossiers backend
- [ ] Endpoint extraction : upload → FFmpeg cuts → OCR → response JSON
- [ ] Endpoint compose : upload modèle → FFmpeg render → output MP4
- [ ] Frontend step 1 (upload) + step 4 (export) — fonctionnel mais minimal

### Phase 2 — Template Editor (Semaine 2-3)
- [ ] Claude Vision intégré dans l'extraction
- [ ] Frontend step 2 : Timeline editor + liste overlays éditables
- [ ] Frontend step 3 : Aperçu crop + option audio
- [ ] Polling statut en temps réel

### Phase 3 — Polish (Semaine 3-4)
- [ ] Vérification FFmpeg/Tesseract au démarrage avec messages clairs
- [ ] Gestion d'erreurs complète sur tous les endpoints
- [ ] UI responsive et soignée
- [ ] Nettoyage automatique des sessions > 1h
- [ ] Tests sur différents types de vidéos OFM

### Hors scope MVP
- Comptes utilisateurs / authentification
- Stockage cloud des templates
- Génération de copy OFM par IA (peut venir en V2)
- Support audio-only (podcast, voiceover)
- Batch processing (plusieurs vidéos en parallèle)
- Application Electron (desktop native)

---

## 8. Contraintes et risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Tesseract ne détecte pas les polices TikTok custom | Haute | Moyen | Fallback Claude Vision pour les frames où OCR confidence < 50 |
| FFmpeg scene detect trop agressif | Moyenne | Moyen | Seuil ajustable dans l'UI (slider 0.2-0.6) |
| Rendu lent > 2 min pour longues vidéos | Moyenne | Faible | Feedback progress bar + traitement par segments |
| Clé API Anthropic épuisée mid-process | Faible | Haut | Check du crédit restant avant lancement + message d'erreur clair |
| Vidéo source avec DRM ou watermark lourd | Haute | Faible | Documenté comme limitation connue — pas bloquant |

---

## 9. Définition of Done

Une feature est considérée terminée quand :
1. Elle fonctionne end-to-end sur une vidéo test de 15-30s
2. Les erreurs sont gérées et affichées proprement dans l'UI
3. Aucun fichier temporaire ne subsiste après export + nettoyage
4. Le code est typé (TypeScript strict, Python type hints)
5. La fonction/endpoint est documenté(e) avec une docstring
