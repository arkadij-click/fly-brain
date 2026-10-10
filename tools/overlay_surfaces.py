#!/usr/bin/env python3
"""Overlay the fly-brain surface map on the kitchen photo.

Usage:  python tools/overlay_surfaces.py [output.png] [photo.jpg]

Draws every surface polygon from simulation.js (fetched via node) over the
kitchen photograph with a normalized-coordinate grid (0.05 steps, labeled).
Use it to visually calibrate polygons: each must hug the real object its
name promises (counter on the countertop, ledge on the sill, ...).
Vertical faces get food:false - flies may stand there, food may not.
"""
import json,os,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw

W,H=1600,900
root=str(Path(__file__).resolve().parent.parent)
out=sys.argv[1] if len(sys.argv)>1 else str(Path(root)/'docs'/'surface-map.png')
photo=sys.argv[2] if len(sys.argv)>2 else str(Path(root)/'kitchen.jpg')

raw=subprocess.check_output([
 'node','-e',
 "const s=require(process.argv[1]+'/simulation');console.log(JSON.stringify({surfaces:s.surfaces,foods:s.foodTypes}));",
 root],cwd=root)
data=json.loads(raw)

img=Image.open(photo).convert('RGB').resize((W,H))
d=ImageDraw.Draw(img)
for i in range(0,21):
    x=i*W/20;d.line([(x,0),(x,H)],fill=(255,80,80));d.text((x+2,2),f'{i*.05:.2f}',fill=(255,120,120))
for j in range(0,13):
    y=j*H/12;d.line([(0,y),(W,y)],fill=(255,80,80));d.text((2,y+2),f'{j*.05:.2f}',fill=(255,120,120))
for s in data['surfaces']:
    pts=[(p[0]*W,p[1]*H) for p in s['poly']]
    d.polygon(pts,outline=(0,255,0))
    cx=sum(p[0] for p in pts)/len(pts);cy=sum(p[1] for p in pts)/len(pts)
    d.text((cx-24,cy-6),(s['name']+('[no food]' if s.get('food') is False else '')),fill=(0,255,0))
for kind,f in data['foods'].items():
    if f.get('photographed'):d.text((f['x']*W-20,f['y']*H-8),f"{kind} {f['x']:.3f},{f['y']:.3f}",fill=(255,0,255))
img.save(out)
print('wrote',out)
