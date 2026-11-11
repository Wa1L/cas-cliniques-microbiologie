# convert.py — Convertit ton Excel en JSON pour le site web
# Installation : pip install openpyxl
# Utilisation : python convert.py

import openpyxl
import json
import os

def excel_to_json():
    # Charge le fichier Excel
    workbook = openpyxl.load_workbook('../cas_cliniques.xlsx')
    sheet = workbook.active
    
    # Récupère les en-têtes (première ligne)
    headers = [cell.value for cell in sheet[1]]
    
    cas_list = []
    
    # Parcourt chaque ligne de données
    for row in sheet.iter_rows(min_row=2, values_only=True):
        cas = {}
        for i, header in enumerate(headers):
            value = row[i]
            if value is None:
                value = ""
            cas[header] = str(value) if value is not None else ""
        
        # Convertit les tags en liste
        if 'tags' in cas and cas['tags']:
            cas['tags'] = [tag.strip() for tag in cas['tags'].split(';') if tag.strip()]
        else:
            cas['tags'] = []
        
        # Convertit le numéro de chapitre en entier
        if 'chapitre_num' in cas:
            try:
                cas['chapitre_num'] = int(cas['chapitre_num'])
            except:
                cas['chapitre_num'] = 0
        
        cas_list.append(cas)
    
    # Crée le fichier JSON final
    output = {
        "total": len(cas_list),
        "cas": cas_list
    }
    
    # Écrit le fichier JSON
    output_path = '../data/cas_cliniques.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Conversion réussie ! {len(cas_list)} cas exportés vers {output_path}")
    print(f"📊 Répartition par partie :")
    
    parties = {}
    for cas in cas_list:
        partie = cas.get('partie', 'Non classé')
        parties[partie] = parties.get(partie, 0) + 1
    
    for partie, count in parties.items():
        print(f"   • {partie}: {count} cas")

if __name__ == "__main__":
    excel_to_json()
