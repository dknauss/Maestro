#!/usr/bin/env python3
"""Admin Menu Maestro — FINAL wp.org assets. Peacock & Coral / Poiret One."""
import os, io, math, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont

OUT = os.environ.get("OUT_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets"))
HERE = os.path.dirname(os.path.abspath(__file__))
LOC = os.path.join(HERE, "fonts")  # PoiretOne-Regular.ttf lives here
# Poppins-*.ttf — bundled alongside Poiret One in ./fonts. Override with POPPINS_DIR.
FD  = os.environ.get("POPPINS_DIR", LOC)

# ---- Peacock & Coral ----
P = dict(deep="#0c2f3a", facet="#124152", shadow="#04161c",
         bone="#f2e7cf", bone_dk="#d8c79f",
         lit="#f0b24a", bronze="#8a4a22", chip="#ef6f53",
         ray1="#ef6f53", ray2="#f0b24a", ray3="#f2e7cf")
GOLD="#f0b24a"; CORAL="#ef6f53"; BONE="#f2e7cf"

def diamond(cx,cy,d,fill,stroke=None,sw=0,op=1.0):
    pts=f"{cx},{cy-d} {cx+d},{cy} {cx},{cy+d} {cx-d},{cy}"
    s=f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    return f'<polygon points="{pts}" fill="{fill}"{s} opacity="{op}"/>'

def sunburst(fx,fy,r,a0,a1,n,pal,halfw=2.2):
    out=[]
    for k in range(n):
        a=a0+(a1-a0)*k/(n-1); r1,r2=math.radians(a-halfw),math.radians(a+halfw)
        p1=(fx+r*math.cos(r1),fy+r*math.sin(r1)); p2=(fx+r*math.cos(r2),fy+r*math.sin(r2))
        c,o=pal[k%len(pal)]
        out.append(f'<polygon points="{fx:.1f},{fy:.1f} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="{c}" opacity="{o}"/>')
    return "".join(out)

def mark_inner():
    s=[f'<rect width="256" height="256" fill="{P["deep"]}"/>',
       f'<polygon points="0,0 256,0 256,206 0,116" fill="url(#bg)"/>',
       sunburst(252,6,360,95,177,11,[(P["ray1"],0.16),(P["ray2"],0.11),(P["ray3"],0.07)],2.2),
       sunburst(4,250,300,-4,-82,7,[(P["ray1"],0.06),(P["ray3"],0.045)],2.0)]
    rows=[(63,108),(99,152),(135,124),(171,170)]; chips=[P["lit"],P["chip"],P["lit"],P["chip"]]
    for (ty,w),_ in zip(rows,chips):
        s.append(f'<rect x="63" y="{ty+4}" width="{w}" height="22" fill="{P["shadow"]}"/>')
        s.append(f'<rect x="37" y="{ty+6}" width="18" height="18" fill="{P["shadow"]}"/>')
    for (ty,w),cc in zip(rows,chips):
        s.append(f'<rect x="34" y="{ty+2}" width="18" height="18" fill="{cc}"/>')
        s.append(f'<polygon points="34,{ty+2} 52,{ty+2} 34,{ty+20}" fill="#ffffff" opacity="0.18"/>')
        sp=int(w*0.62)
        s.append(f'<rect x="60" y="{ty}" width="{sp}" height="22" fill="{P["bone"]}"/>')
        s.append(f'<rect x="{60+sp}" y="{ty}" width="{w-sp}" height="22" fill="{P["bone_dk"]}"/>')
    G=(64,202);T=(209,57);nx,ny=0.7071,0.7071;w0=7.0
    Ga=(G[0]-w0*nx,G[1]-w0*ny);Gb=(G[0]+w0*nx,G[1]+w0*ny)
    s.append(f'<polygon points="{Ga[0]+3:.1f},{Ga[1]+3:.1f} {T[0]+3},{T[1]+3} {Gb[0]+3:.1f},{Gb[1]+3:.1f}" fill="{P["shadow"]}" opacity="0.5"/>')
    s.append(f'<polygon points="{Ga[0]:.1f},{Ga[1]:.1f} {T[0]},{T[1]} {G[0]},{G[1]}" fill="{P["lit"]}"/>')
    s.append(f'<polygon points="{G[0]},{G[1]} {T[0]},{T[1]} {Gb[0]:.1f},{Gb[1]:.1f}" fill="{P["bronze"]}"/>')
    s.append(f'<line x1="{G[0]}" y1="{G[1]}" x2="{T[0]}" y2="{T[1]}" stroke="{P["shadow"]}" stroke-width="1"/>')
    s.append(f'<polygon points="{Ga[0]:.1f},{Ga[1]:.1f} {T[0]},{T[1]} {Gb[0]:.1f},{Gb[1]:.1f}" fill="none" stroke="{P["shadow"]}" stroke-width="2.4"/>')
    s.append(diamond(59,207,14,P["shadow"],op=0.5))
    s.append(diamond(59,207,13,P["lit"],stroke=P["shadow"],sw=2))
    s.append(diamond(59,207,7,P["chip"]))
    for dx,dy,d in [(224,40,4.5),(236,27,3.2),(245,18,2.2)]:
        s.append(diamond(dx,dy,d,P["ray1"]))
    return "".join(s)

DEFS=f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="{P["facet"]}"/><stop offset="1" stop-color="{P["deep"]}"/></linearGradient></defs>'

def icon_svg():
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" '
            f'role="img" aria-label="Maestro: The Inline Admin Menu Editor">{DEFS}{mark_inner()}</svg>')

def banner_svg(W=1544,H=500):
    badge,bx,by=300,104,100
    spot=sunburst(W+10,-10,1120,100,172,13,[(GOLD,0.10),(CORAL,0.07),(BONE,0.05)],1.5)
    spot2=sunburst(-10,H+10,760,-3,-66,7,[(GOLD,0.04),(BONE,0.03)],1.5)
    divx=470
    divider=(f'<rect x="{divx}" y="120" width="2" height="260" fill="{GOLD}" opacity="0.55"/>'
             f'<rect x="{divx+8}" y="120" width="2" height="260" fill="{GOLD}" opacity="0.30"/>'
             f'{diamond(divx+5,120,6,CORAL,op=0.8)}{diamond(divx+5,380,6,CORAL,op=0.8)}')
    frame=(f'<rect x="{bx}" y="{by}" width="{badge}" height="{badge}" fill="none" stroke="{GOLD}" stroke-opacity="0.55" stroke-width="2"/>'
           f'<rect x="{bx+9}" y="{by+9}" width="{badge-18}" height="{badge-18}" fill="none" stroke="{GOLD}" stroke-opacity="0.30" stroke-width="1.5"/>')
    for ccx,ccy in [(bx,by),(bx+badge,by),(bx,by+badge),(bx+badge,by+badge)]:
        frame+=f'<rect x="{ccx-5}" y="{ccy-5}" width="10" height="10" fill="{CORAL}"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Maestro: The Inline Admin Menu Editor">
{DEFS}
<rect width="{W}" height="{H}" fill="{P["deep"]}"/>
<polygon points="0,0 {W},0 {W},300 0,170" fill="url(#bg)"/>
{spot}{spot2}
<rect x="{bx}" y="{by}" width="{badge}" height="{badge}" fill="{P["deep"]}"/>
<clipPath id="bc"><rect x="{bx}" y="{by}" width="{badge}" height="{badge}"/></clipPath>
<g clip-path="url(#bc)"><g transform="translate({bx+24},{by+24}) scale({(badge-48)/256.0:.5f})">{mark_inner()}</g></g>
{frame}{divider}
</svg>'''

def png(svg,w,h):
    # Rasterize via Inkscape (no cairo/cairosvg dependency — works on macOS).
    with tempfile.NamedTemporaryFile("w",suffix=".svg",delete=False) as sf:
        sf.write(svg); svgp=sf.name
    pngp=svgp[:-4]+".png"
    subprocess.run(["inkscape",svgp,"--export-type=png","--export-filename="+pngp,
                    "-w",str(w),"-h",str(h)],check=True,capture_output=True)
    data=open(pngp,"rb").read(); os.unlink(svgp); os.unlink(pngp); return data
def fnt(p,s,inst=None):
    f=ImageFont.truetype(p,s)
    if inst:
        try:f.set_variation_by_name(inst)
        except Exception:pass
    return f
def tlen(dr,t,f,tr): return sum(dr.textlength(c,font=f)+tr for c in t)-tr
def tracked(dr,xy,text,f,fill,tr):
    x,y=xy
    for ch in text:
        dr.text((x,y),ch,font=f,fill=fill); x+=dr.textlength(ch,font=f)+tr
    return x
def grad_text(text,f,c0,c1,tr=0):
    box=(4000,600);t=Image.new("L",box,0);d=ImageDraw.Draw(t);x=0
    for ch in text:
        d.text((x,0),ch,font=f,fill=255);x+=d.textlength(ch,font=f)+tr
    bb=t.getbbox();m=t.crop(bb);w,h=m.size;g=Image.new("RGBA",(w,h));px=g.load()
    for yy in range(h):
        tt=yy/max(1,h-1);r=int(c0[0]+(c1[0]-c0[0])*tt);gg=int(c0[1]+(c1[1]-c0[1])*tt);b=int(c0[2]+(c1[2]-c0[2])*tt)
        for xx in range(w):px[xx,yy]=(r,gg,b,255)
    g.putalpha(m);return g

def build_banners():
    S=2;W,H=1544,500
    master=Image.open(io.BytesIO(png(banner_svg(W,H),W*S,H*S))).convert("RGBA")
    dr=ImageDraw.Draw(master)
    tx=512*S; maxw=(1486-512)*S

    # hero MAESTRO in Poiret One (amber gradient), auto-fit, letter-spaced
    size=176*S; tr_hero=14*S
    while True:
        fh=fnt(f"{LOC}/PoiretOne-Regular.ttf",size)
        word=grad_text("MAESTRO",fh,(248,208,137),(214,138,47),tr=tr_hero)
        if word.size[0]<=maxw or size<=110*S: break
        size-=2
    ww,wh=word.size

    # tagline (sentence case, longer)
    tag="Orchestrate your menu in place, inside the dashboard."
    ts=34*S
    ftag=fnt(f"{FD}/Poppins-Light.ttf",ts)
    while dr.textlength(tag,font=ftag)>ww and ts>20*S:
        ts-=1; ftag=fnt(f"{FD}/Poppins-Light.ttf",ts)
    tb=dr.textbbox((0,0),tag,font=ftag); th=tb[3]-tb[1]

    # coral descriptor — DESC controls placement: "below" (default), "above", "none".
    # "below" reads brand-first (MAESTRO / Inline Admin Menu Editor); "above" reuses
    # the old overline slot but reads generic-phrase-first.
    desc=os.environ.get("DESC","below")
    desc_text={"above":"INLINE ADMIN MENU","below":"THE INLINE ADMIN MENU EDITOR"}.get(desc)
    tr_desc=8*S; CORAL=(239,111,83,255)
    if desc_text:
        fit=ww if desc=="below" else maxw   # below: tuck the subtitle under the wordmark
        ds=30*S
        while True:
            f_desc=fnt(f"{FD}/Poppins-Medium.ttf",ds)
            if tlen(dr,desc_text,f_desc,tr_desc)<=fit or ds<=16*S: break
            ds-=1
        db=dr.textbbox((0,0),desc_text,font=f_desc); dh=db[3]-db[1]
    else:
        f_desc=None; db=None; dh=0

    g1, botruleh, g3 = 16*S, 6*S, 22*S
    blocks=(([dh,g1] if desc=="above" else [])+[wh,g1]
            +([dh,g1] if desc=="below" else [])+[botruleh,g3,th])
    y=(H*S-sum(blocks))/2

    def draw_desc(yy):
        if desc=="above":
            ly=int(yy+dh*0.55)
            dr.line([(tx,ly),(tx+26*S,ly)],fill=(239,111,83,210),width=max(2,2*S))
            tracked(dr,(tx+40*S,yy),desc_text,f_desc,CORAL,tr_desc)
        else:
            tracked(dr,(tx,yy),desc_text,f_desc,CORAL,tr_desc)

    if desc=="above":
        draw_desc(y-db[1]); y+=dh+g1
    master.alpha_composite(word,(tx,int(y))); word_right=tx+ww; y+=wh+g1
    if desc=="below":
        draw_desc(y-db[1]); y+=dh+g1

    # bottom gold rule with diamond terminals
    ry=int(y+botruleh/2)
    dr.line([(tx+2*S,ry),(word_right-2*S,ry)],fill=(240,178,74,235),width=max(2,3*S//2))
    for dxe in (tx+2*S,word_right-2*S):
        d=7*S//2; dr.polygon([(dxe,ry-d),(dxe+d,ry),(dxe,ry+d),(dxe-d,ry)],fill=(248,208,137,255))
    y+=botruleh+g3

    dr.text((tx,y-tb[1]),tag,font=ftag,fill=(236,224,196,255))

    suf=os.environ.get("VARIANT_SUFFIX","")
    for w,h,fn in [(1544,500,f"banner-1544x500{suf}.png"),(772,250,f"banner-772x250{suf}.png")]:
        master.resize((w,h),Image.LANCZOS).convert("RGB").save(f"{OUT}/{fn}","PNG",optimize=True); print("wrote",fn)

def build_icons():
    svg=icon_svg(); open(f"{OUT}/icon.svg","w").write(svg); print("wrote icon.svg")
    m=Image.open(io.BytesIO(png(svg,1024,1024))).convert("RGB")
    for s in (256,128):
        m.resize((s,s),Image.LANCZOS).save(f"{OUT}/icon-{s}x{s}.png","PNG",optimize=True); print(f"wrote icon-{s}x{s}.png")

if __name__=="__main__":
    build_icons(); build_banners(); print("DONE")
