# -*- coding: utf-8 -*-
"""Statik sayfaları üretir.

Kullanım:  python src/build.py

templates/*.html içindeki {{yer_tutucular}} content.py'deki verilerle doldurulur,
<img data-pic="marka/gorsel"> etiketleri src/srcset/width/height ile genişletilir.
Çıktı: index.html (restoran) ve kafe/index.html (kafe).
"""
import html
import json
import re
from pathlib import Path

from content import ALLERGENS, LODOS, PERVAZ

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
SITE = "https://yunusemrecirak.github.io/mekan-sablonu/"
IMAGES = json.loads((SRC / "images.json").read_text(encoding="utf-8"))
AL = {k: (code, tr, en, i + 1) for i, (k, code, tr, en) in enumerate(ALLERGENS)}
DAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]
DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

TAGS = {
    "chef": ("Şefin seçimi", "Chef's pick"),
    "share": ("Paylaşımlık", "To share"),
    "spicy": ("Acı", "Spicy"),
    "new": ("Yeni", "New"),
    "soldout": ("Bugün bitti", "Sold out today"),
}
DIET = {"vg": ("Vegan", "Vegan"), "v": ("Vejetaryen", "Vegetarian")}


def esc(s):
    return html.escape(str(s), quote=True)


def price_fmt(n):
    return f"{n:,}".replace(",", ".")


def hm(m):
    m %= 1440
    return f"{m // 60:02d}.{m % 60:02d}"


def img_urls(key, base):
    meta = IMAGES[key]
    sizes = sorted(int(s) for s in meta["files"])
    brand, name = key.split("/")
    return meta, sizes, (lambda s: f"{base}assets/img/{brand}/{name}-{s}.webp")


def expand_pics(markup, base):
    def rep(m):
        tag, attrs = m.group(1), m.group(2)
        key = re.search(r'data-pic="([^"]+)"', attrs).group(1)
        meta, sizes, url = img_urls(key, base)
        attrs = re.sub(r'\s*data-pic="[^"]+"', "", attrs).rstrip()
        srcset = ", ".join(f"{url(s)} {s}w" for s in sizes)
        extra = f' srcset="{srcset}" width="{meta["w"]}" height="{meta["h"]}"'
        if tag == "img":
            mid = sizes[1] if len(sizes) > 1 else sizes[0]
            extra = f' src="{url(mid)}"' + extra
            if "loading=" not in attrs:
                extra += ' loading="lazy"'
            if "decoding=" not in attrs:
                extra += ' decoding="async"'
        return f"<{tag}{attrs}{extra}>"

    return re.sub(r'<(img|source)\b([^>]*?\bdata-pic="[^"]+"[^>]*?)\s*/?>', rep, markup)


def al_chips(codes):
    out = []
    for k in codes:
        code, tr, en, n = AL[k]
        out.append(
            f'<abbr class="al" title="{esc(tr)}" data-al="{k}"><sup>{n}</sup>{esc(code)}</abbr>'
        )
    return "".join(out)


def dish_html(d, idx, brand, base):
    tags, diet, al = d.get("tags", []), d.get("diet", []), d.get("al", [])
    img = d.get("img")
    card = brand == "pervaz" and img
    classes = ["dish"]
    if "soldout" in tags:
        classes.append("is-soldout")
    if card:
        classes.append("dish--card")
    if img:
        classes.append("has-img")
    data = [
        f'data-diet="{" ".join(diet)}"',
        f'data-al="{" ".join(al)}"',
        f'data-kcal="{d.get("kcal", 0)}"',
        f'data-tags="{" ".join(tags)}"',
    ]
    if img:
        _, sizes, url = img_urls(img, base)
        data.append(f'data-img="{url(sizes[0])}"')
        data.append(f'data-img-lg="{url(sizes[min(1, len(sizes) - 1)])}"')
    price = d.get("price_label") or price_fmt(d["price"])
    tag_html = "".join(
        f'<span class="dish__tag dish__tag--{t}" data-en="{esc(TAGS[t][1])}">{esc(TAGS[t][0])}</span>'
        for t in tags if t in TAGS
    )
    dk = "vg" if "vg" in diet else ("v" if "v" in diet else None)
    diet_html = f'<span class="dish__diet" data-en="{DIET[dk][1]}">{DIET[dk][0]}</span>' if dk else ""
    kcal = d.get("kcal", 0)
    kcal_html = f'<span class="dish__kcal">{kcal} kcal</span>' if kcal else ""
    media = ""
    if card:
        media = (f'<span class="dish__media"><img data-pic="{img}" alt="" '
                 f'sizes="(min-width: 1100px) 22vw, (min-width: 700px) 40vw, 86vw"></span>')
    return (
        f'<li class="{" ".join(classes)}" {" ".join(data)}>'
        f'<button class="dish__btn" type="button" aria-haspopup="dialog">{media}'
        f'<span class="dish__no">{idx:02d}</span>'
        f'<span class="dish__body">'
        f'<span class="dish__line"><span class="dish__name" data-en="{esc(d["en"])}">{esc(d["tr"])}</span>'
        f'<span class="dish__dots" aria-hidden="true"></span>'
        f'<span class="dish__price">{esc(price)}<small> ₺</small></span></span>'
        f'<span class="dish__desc" data-en="{esc(d["den"])}">{esc(d["dtr"])}</span>'
        f'<span class="dish__meta">{tag_html}{diet_html}<span class="dish__als">{al_chips(al)}</span>{kcal_html}</span>'
        f'</span></button></li>'
    )


def menu_html(data, base):
    out, n = [], 0
    for i, (key, tr, en, ntr, nen) in enumerate(data["cats"], 1):
        items = [d for d in data["menu"] if d["cat"] == key]
        lis = []
        for d in items:
            n += 1
            lis.append(dish_html(d, n, data["slug"], base))
        out.append(
            f'<section class="cat" id="m-{key}" data-cat="{key}" aria-labelledby="c-{key}">'
            f'<header class="cat__head"><span class="cat__no">{i:02d}</span>'
            f'<h3 class="cat__name" id="c-{key}" data-en="{esc(en)}">{esc(tr)}</h3>'
            f'<p class="cat__note" data-en="{esc(nen)}">{esc(ntr)}</p></header>'
            f'<ol class="dishes">{"".join(lis)}</ol></section>'
        )
    return "\n".join(out)


def cats_nav(data):
    return "".join(
        f'<a href="#m-{k}" data-cat-link="{k}" data-en="{esc(en)}">{esc(tr)}</a>'
        for k, tr, en, _, _ in data["cats"]
    )


def legend_html():
    cells = "".join(
        f'<li><abbr class="al" title="{esc(tr)}"><sup>{n}</sup>{esc(code)}</abbr>'
        f'<span data-en="{esc(en)}">{esc(tr)}</span></li>'
        for k, (code, tr, en, n) in AL.items()
    )
    return f'<ul class="legend__grid">{cells}</ul>'


def hours_rows(hours):
    rows = []
    for d in [1, 2, 3, 4, 5, 6, 0]:
        r = hours[d]
        val = " · ".join(f"{hm(a)}–{hm(b)}" for a, b in r) if r else "Kapalı"
        rows.append(f'<tr data-day="{d}"><th scope="row">{DAYS_TR[d]}</th><td>{val}</td></tr>')
    return "".join(rows)


def jsonld(data, kind, cuisine, url):
    spec = []
    for d, r in data["hours"].items():
        for a, b in r:
            spec.append({
                "@type": "OpeningHoursSpecification", "dayOfWeek": DAYS_EN[d],
                "opens": hm(a).replace(".", ":"), "closes": hm(b).replace(".", ":"),
            })
    obj = {
        "@context": "https://schema.org", "@type": kind, "name": data["name"], "url": url,
        "address": {"@type": "PostalAddress", "streetAddress": data["address"][0],
                    "addressLocality": "Kadıköy", "addressRegion": "İstanbul", "addressCountry": "TR"},
        "servesCuisine": cuisine, "priceRange": "₺₺", "acceptsReservations": True,
        "hasMenu": url + "#menu", "openingHoursSpecification": spec,
    }
    return json.dumps(obj, ensure_ascii=False)


def config_json(data, extra):
    cfg = {
        "brand": data["slug"], "name": data["name"],
        "hours": {str(k): v for k, v in data["hours"].items()},
        "reserve": data["reserve"],
    }
    cfg.update(extra)
    return json.dumps(cfg, ensure_ascii=False)


def render(tpl_name, data, out_path, base, url, kind, cuisine, extra):
    tpl = (SRC / "templates" / tpl_name).read_text(encoding="utf-8")
    reps = {
        "{{menu}}": menu_html(data, base),
        "{{cats_nav}}": cats_nav(data),
        "{{legend}}": legend_html(),
        "{{hours_rows}}": hours_rows(data["hours"]),
        "{{config}}": config_json(data, extra),
        "{{jsonld}}": jsonld(data, kind, cuisine, url),
        "{{count}}": str(len(data["menu"])),
        "{{site}}": SITE,
        "{{url}}": url,
        "{{base}}": base,
    }
    for k, v in reps.items():
        tpl = tpl.replace(k, v)
    tpl = expand_pics(tpl, base)
    left = re.findall(r"\{\{[a-z_]+\}\}", tpl)
    if left:
        raise SystemExit(f"Doldurulmamış yer tutucu: {left}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(tpl, encoding="utf-8", newline="\n")
    print("yazıldı:", out_path.relative_to(ROOT), f"({len(tpl) // 1024} KB)")


if __name__ == "__main__":
    render("lodos.html", LODOS, ROOT / "index.html", "./", SITE, "Restaurant",
           ["Türk", "Deniz ürünleri", "Meze"],
           {"wifi": {"ssid": "Lodos-Misafir", "pass": "lufer2026"}})
    render("pervaz.html", PERVAZ, ROOT / "kafe" / "index.html", "../", SITE + "kafe/", "CafeOrCoffeeShop",
           ["Kahve", "Fırın", "Kahvaltı"],
           {"wifi": {"ssid": "Pervaz", "pass": "eksimaya"}})
