# CLAUDE.md — ReelClone

## Rôle et contexte

Tu es l'assistant de développement de **ReelClone**, un outil desktop/web qui permet à des OFM managers d'extraire le template visuel d'une vidéo TikTok ou Instagram Reel existante, puis d'y substituer leur propre vidéo de modèle pour recréer le même format — même timing, même texte overlay, même structure de coupe.

Tu dois coder de manière autonome, proprement, et en suivant l'architecture définie dans le PRD. Tu ne demandes de confirmation que si une décision impacte l'architecture globale.

---

## Stack technique

- **Backend** : Python 3.11+ avec FastAPI
- **Traitement vidéo** : FFmpeg (via subprocess ou ffmpeg-python)
- **OCR** : Tesseract via pytesseract + OpenCV pour détection de frames
- **Analyse IA** : Anthropic API (claude-haiku-20240307 pour structure, claude-sonnet-4-20250514 pour analyse visuelle complexe)
- **Frontend** : Next.js 14 + TypeScript + Tailwind CSS
- **Upload/stockage** : Local filesystem (dossier /tmp/reelclone/)
- **Clé API** : Fournie par l'utilisateur via l'interface (jamais hardcodée)

---

## Règles absolues

1. **Ne jamais hardcoder une clé API Anthropic** — elle est toujours passée par l'user via l'UI et stockée en session uniquement
2. **Tous les fichiers vidéo temporaires** vont dans `/tmp/reelclone/{session_id}/` et sont supprimés après export
3. **Pas de base de données** pour le MVP — filesystem uniquement
4. **FFmpeg doit être installé sur la machine** — vérifier sa présence au démarrage et afficher une erreur claire sinon
5. **Tesseract doit être installé** — même vérification au démarrage
6. Toujours gérer les erreurs avec des messages clairs côté UI — jamais de crash silencieux
7. Le traitement vidéo se fait entièrement **côté serveur/backend** — le frontend ne manipule jamais de vidéo directement
8. **Format de sortie** : toujours MP4 H.264, 9:16, 1080x1920

---

## Architecture des dossiers

```
reelclone/
├── backend/
│   ├── main.py                  # FastAPI app + routes
│   ├── extractor/
│   │   ├── __init__.py
│   │   ├── cuts.py              # Détection des cuts via FFmpeg
│   │   ├── ocr.py               # Extraction texte overlay via Tesseract
│   │   ├── audio.py             # Extraction/séparation piste audio
│   │   └── analyzer.py          # Analyse IA des frames (Claude Vision)
│   ├── composer/
│   │   ├── __init__.py
│   │   ├── template.py          # Dataclass Template + sérialisation JSON
│   │   ├── renderer.py          # Applique template sur nouvelle vidéo (FFmpeg)
│   │   └── overlay.py           # Gère les overlays texte/timing
│   ├── utils/
│   │   ├── ffmpeg_check.py      # Vérification FFmpeg + Tesseract au boot
│   │   ├── session.py           # Gestion sessions temporaires
│   │   └── validators.py        # Validation formats vidéo input
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Home — upload source video
│   │   ├── review/page.tsx      # Revue du template extrait
│   │   ├── compose/page.tsx     # Upload vidéo modèle + preview
│   │   └── export/page.tsx      # Export final
│   ├── components/
│   │   ├── VideoUpload.tsx
│   │   ├── TemplatePreview.tsx
│   │   ├── TimelineEditor.tsx   # Éditeur timeline simple
│   │   ├── ApiKeyInput.tsx      # Champ clé API (masqué, session only)
│   │   └── ExportButton.tsx
│   └── lib/
│       ├── api.ts               # Appels backend
│       └── types.ts             # Types TypeScript partagés
├── CLAUDE.md
├── SKILLS.md
└── PRD.md
```

---

## Comportement attendu par module

### `extractor/cuts.py`
- Utilise `ffprobe` pour détecter les keyframes et scènes
- Retourne une liste de timestamps `[{start: float, end: float, type: "cut"|"transition"}]`
- Seuil de détection de scène : 0.3 (ajustable)

### `extractor/ocr.py`
- Sample une frame toutes les 0.5 secondes
- Pour chaque frame, Tesseract détecte les zones de texte
- Retourne `[{text: str, x: int, y: int, w: int, h: int, timestamp: float, duration: float}]`
- Grouper les textes identiques consécutifs pour calculer la durée d'affichage

### `extractor/analyzer.py`
- Envoie 5-8 frames clés à Claude Vision (claude-sonnet-4-20250514)
- Demande : style visuel, position dominante du texte, type de contenu, ambiance
- Retourne un objet `VisualStyle` avec ces métadonnées
- Utilise la clé API passée en paramètre — jamais de variable globale

### `composer/renderer.py`
- Prend un objet `Template` + le chemin de la nouvelle vidéo
- Crop/resize la nouvelle vidéo en 9:16 1080x1920 via FFmpeg
- Applique chaque segment selon le timing extrait
- Burn les overlays texte aux positions détectées
- Merge avec la piste audio originale ou une nouvelle

### `composer/template.py`
```python
@dataclass
class Template:
    duration: float
    cuts: List[Cut]
    overlays: List[TextOverlay]
    audio_path: Optional[str]
    visual_style: VisualStyle
    source_video_path: str
    
    def to_json(self) -> dict: ...
    @classmethod
    def from_json(cls, data: dict) -> "Template": ...
```

---

## Flow API Backend

```
POST /api/extract          # Upload vidéo source → retourne session_id + template JSON
GET  /api/template/{id}    # Récupère le template d'une session
PUT  /api/template/{id}    # Modifie manuellement le template (ajustements user)
POST /api/compose/{id}     # Upload vidéo modèle → lance le rendu
GET  /api/status/{id}      # Polling du statut de rendu (progress %)
GET  /api/export/{id}      # Télécharge la vidéo finale
DELETE /api/session/{id}   # Nettoie les fichiers temporaires
```

---

## Gestion des erreurs

| Erreur | Message UI |
|--------|-----------|
| FFmpeg absent | "FFmpeg n'est pas installé. Installe-le via brew install ffmpeg (Mac) ou apt install ffmpeg (Linux)" |
| Vidéo format invalide | "Format non supporté. Utilise un fichier MP4, MOV ou WebM." |
| OCR aucun texte détecté | "Aucun texte overlay détecté. La vidéo source n'a peut-être pas de texte burn-in." |
| Clé API invalide | "Clé API Anthropic invalide. Vérifie ta clé sur console.anthropic.com" |
| Rendu échoué | "Erreur de rendu. Vérifie que ta vidéo n'est pas corrompue." |

---

## Conventions de code

- Python : snake_case, type hints partout, docstrings sur toutes les fonctions publiques
- TypeScript : PascalCase pour composants, camelCase pour fonctions/variables
- Pas de `any` en TypeScript
- Toujours `async/await` côté frontend pour les appels API
- Logs backend avec `logging` (pas de `print`)
- Variables d'environnement dans `.env` (PORT, TEMP_DIR) — jamais de secrets dans `.env`
