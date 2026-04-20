# SKILLS.md — ReelClone

Connaissances métier et techniques que Claude Code doit maîtriser pour construire ReelClone correctement.

---

## 1. Contexte métier — OFM (OnlyFans Management)

### Ce qu'est un OFM manager
Un OFM manager gère les comptes de créatrices de contenu. Son job sur TikTok/Reels est de produire du contenu d'appel (teaser, hook, curiosité) qui redirige vers le profil payant. Il travaille sur du volume — plusieurs vidéos par jour, plusieurs modèles.

### Son besoin réel
Il voit une vidéo qui performe (fort engagement, viral), il veut **cloner son format** en remplaçant uniquement la vidéo de fond. Pas de montage complexe, pas d'After Effects — juste du copier-coller de structure.

### Les types de contenus OFM TikTok/Reels en 2026
1. **Teaser flou** — vidéo intentionnellement floutée ou censurée, texte overlay mystérieux
2. **Hook curiosité** — "tu savais que..." ou "personne ne parle de ça"
3. **POV / roleplay** — texte overlay narratif, découpe en séquences
4. **Countdown/reveal** — séquence de montée en tension avec reveal final
5. **Trending audio** — vidéo calée sur un son viral du moment

### Règles de copywriting OFM 2026 (à injecter dans les prompts IA)
```
- Hook dans les 1.5 premières secondes — l'algo TikTok/Reels juge la rétention dès le début
- Durée idéale : 15-30s pour teaser, 30-45s pour storytelling
- Texte overlay : max 6 mots par ligne, police lisible, contraste fort
- CTA final toujours vers "lien en bio" — jamais de mention directe de plateformes adultes
- Pas de nudité même partielle — le flou stratégique est la norme
- Structure gagnante : HOOK (0-2s) → CURIOSITÉ (2-10s) → MICRO-REVEAL (10-25s) → CTA (dernières 3s)
- Les questions performent mieux que les affirmations en overlay text
- Emojis avec parcimonie — max 1-2 par overlay, et jamais dans le hook
```

---

## 2. Techniques FFmpeg essentielles

### Détecter les scènes/cuts
```bash
ffprobe -v quiet -show_frames -select_streams v \
  -of json input.mp4 | python parse_scenes.py

# Ou avec filtre scene detect :
ffmpeg -i input.mp4 -filter:v "select='gt(scene,0.3)',showinfo" \
  -f null - 2>&1 | grep showinfo
```

### Extraire des frames pour analyse
```bash
# Une frame toutes les 0.5 secondes
ffmpeg -i input.mp4 -vf fps=2 /tmp/frames/frame_%04d.jpg

# Frames spécifiques à des timestamps
ffmpeg -i input.mp4 -ss 00:00:02 -vframes 1 frame_2s.jpg
```

### Crop et resize en 9:16
```bash
# Si la vidéo source est 16:9, crop au centre en 9:16
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" output.mp4

# Si déjà vertical mais mauvaise résolution
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" output.mp4
```

### Burn un texte overlay avec timing
```bash
ffmpeg -i input.mp4 -vf \
  "drawtext=text='Mon texte':fontfile=/path/to/font.ttf:\
   fontsize=48:fontcolor=white:borderw=3:bordercolor=black:\
   x=(w-text_w)/2:y=h*0.8:\
   enable='between(t,2.0,5.5)'" \
  output.mp4
```

### Remplacer la piste audio
```bash
ffmpeg -i video.mp4 -i audio.mp3 \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 \
  -shortest output.mp4
```

### Merger plusieurs segments vidéo
```bash
# Créer un fichier concat list
echo "file 'seg1.mp4'" > concat.txt
echo "file 'seg2.mp4'" >> concat.txt
ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4
```

---

## 3. Tesseract OCR — bonnes pratiques pour vidéo

### Installation
```bash
# Mac
brew install tesseract

# Ubuntu/Debian
apt install tesseract-ocr tesseract-ocr-fra
```

### Utilisation Python
```python
import pytesseract
from PIL import Image
import cv2
import numpy as np

def extract_text_from_frame(frame_path: str) -> list[dict]:
    img = cv2.imread(frame_path)
    
    # Prétraitement pour améliorer l'OCR
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Augmenter le contraste
    enhanced = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)
    
    # OCR avec données de bounding boxes
    data = pytesseract.image_to_data(
        enhanced, 
        output_type=pytesseract.Output.DICT,
        config='--psm 11'  # Mode sparse text — bon pour overlays
    )
    
    results = []
    for i, text in enumerate(data['text']):
        if text.strip() and int(data['conf'][i]) > 50:  # Confiance > 50%
            results.append({
                'text': text,
                'x': data['left'][i],
                'y': data['top'][i],
                'w': data['width'][i],
                'h': data['height'][i],
                'confidence': data['conf'][i]
            })
    return results
```

### Problèmes courants et solutions
| Problème | Solution |
|----------|----------|
| Texte sur fond coloré mal détecté | Appliquer un threshold adaptatif avant OCR |
| Texte trop petit | Upscale la frame x2 avant OCR |
| Faux positifs | Filtrer confidence < 60 |
| Texte avec ombre/bordure | Détecter les deux layers et dédupliquer |

---

## 4. Claude Vision — prompts optimisés pour analyse de Reels

### Prompt d'analyse visuelle (claude-sonnet)
```python
VISUAL_ANALYSIS_PROMPT = """
Tu analyses des frames d'une vidéo TikTok ou Instagram Reel.

Pour chaque frame fournie, identifie :
1. LAYOUT : position dominante du contenu (haut/centre/bas, gauche/droite)
2. TEXT_ZONE : où les textes overlay sont placés (coordonnées relatives 0-1)
3. STYLE : ambiance visuelle (sombre/clair, saturé/désaturé, flou/net)
4. CONTENT_TYPE : type de contenu détecté (teaser, POV, tutorial, lifestyle, etc.)
5. TRANSITIONS : type de transition visible si c'est une frame de coupure

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "layout": "center-bottom",
  "text_zones": [{"x": 0.1, "y": 0.75, "w": 0.8, "h": 0.15}],
  "style": {"brightness": "dark", "saturation": "high", "blur": false},
  "content_type": "teaser",
  "transition": null
}
"""
```

### Prompt de génération copy OFM (claude-sonnet)
```python
OFM_COPY_PROMPT = """
Tu es un expert en copywriting pour OFM (OnlyFans Management) sur TikTok et Instagram Reels en 2026.

Génère des textes overlay pour une vidéo de type : {content_type}
Durée de la vidéo : {duration} secondes
Ton : {tone}

Règles strictes :
- Hook dans les 1.5 premières secondes
- Max 6 mots par overlay
- Structure : HOOK → CURIOSITÉ → MICRO-REVEAL → CTA
- CTA final = "lien en bio" uniquement
- Pas de mention directe de plateforme adulte
- Les questions performent mieux que les affirmations

Réponds UNIQUEMENT en JSON :
{
  "overlays": [
    {"text": "tu savais ça sur moi ?", "start": 0.0, "end": 2.0, "position": "top"},
    {"text": "personne ne le dit...", "start": 2.5, "end": 6.0, "position": "center"},
    {"text": "lien en bio 🔗", "start": {duration-3}, "end": {duration}, "position": "bottom"}
  ]
}
"""
```

---

## 5. Gestion des sessions temporaires

### Structure de dossier par session
```
/tmp/reelclone/
└── {session_id}/          # UUID v4
    ├── source.mp4          # Vidéo uploadée par l'user
    ├── frames/             # Frames extraites pour OCR/analyse
    │   ├── frame_0001.jpg
    │   └── ...
    ├── audio.aac           # Piste audio extraite
    ├── template.json       # Template extrait sérialisé
    ├── model_video.mp4     # Vidéo modèle uploadée
    ├── segments/           # Segments découpés
    └── output.mp4          # Vidéo finale exportée
```

### Nettoyage automatique
```python
import asyncio
import shutil
from pathlib import Path

async def cleanup_session(session_id: str, delay_seconds: int = 3600):
    """Nettoie les fichiers après 1h ou après téléchargement."""
    await asyncio.sleep(delay_seconds)
    session_path = Path(f"/tmp/reelclone/{session_id}")
    if session_path.exists():
        shutil.rmtree(session_path)
```

---

## 6. Limites connues et workarounds

| Limite | Workaround |
|--------|-----------|
| Tesseract ne détecte pas les polices stylisées TikTok | Utiliser Claude Vision en fallback |
| FFmpeg scene detect rate des faux positifs sur vidéos avec flashs | Augmenter le seuil à 0.4 |
| Textes burn-in impossibles à supprimer proprement | Les re-créer à la même position avec le même style |
| Vidéos avec sous-titres automatiques TikTok | Les ignorer (confidence OCR < 40 généralement) |
| Rendu lent pour vidéos > 60s | Découper en segments, traiter en parallèle |
| Watermark TikTok visible | Crop léger sur les coins + reframe |

---

## 7. Variables d'environnement (.env)

```env
PORT=8000
TEMP_DIR=/tmp/reelclone
MAX_VIDEO_SIZE_MB=500
MAX_VIDEO_DURATION_SECONDS=180
FFMPEG_PATH=/usr/local/bin/ffmpeg
FFPROBE_PATH=/usr/local/bin/ffprobe
TESSERACT_PATH=/usr/local/bin/tesseract
```

Note : La clé API Anthropic n'est JAMAIS dans `.env`. Elle est passée par l'utilisateur via l'UI.
