# Third-party licenses and source attribution

These notices identify third-party software, the bundled font, and the sources used to assemble the lighthouse map. They do not assign a license to the project's original code, original writing, or the curated lighthouse collection as a whole. Each upstream license applies to its own material.

## D3

The bundled file [data/d3.min.js](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/d3.min.js) is **D3 7.9.0**. Its version is present in both the file header and the library's exported `version` value.

- Copyright 2010–2023 Mike Bostock.
- License: **ISC**, as declared by the [official 7.9.0 package metadata](https://github.com/d3/d3/blob/v7.9.0/package.json).
- The complete, unmodified upstream license is retained in [data/D3-LICENSE.txt](D3-LICENSE.txt), copied from the [official tagged license](https://github.com/d3/d3/blob/v7.9.0/LICENSE).
- Project: [D3](https://d3js.org/).

Keep the copyright and permission notice with distributed copies, including a self-contained page that embeds the library. The short version/copyright header alone is not the complete permission notice.

The full D3 bundle also includes its Delaunay implementation and supporting code. Their additional notices are reproduced below; these are bundled components, not additional scripts fetched by the map.

### d3-delaunay

Upstream [license](https://github.com/d3/d3-delaunay/blob/v6.0.4/LICENSE) and [dependency declaration](https://github.com/d3/d3-delaunay/blob/v6.0.4/package.json):

```text
Copyright 2018-2021 Observable, Inc.
Copyright 2021 Mapbox

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### Delaunator

Upstream [license](https://github.com/mapbox/delaunator/blob/v5.0.0/LICENSE) and [dependency declaration](https://github.com/mapbox/delaunator/blob/v5.0.0/package.json):

```text
ISC License

Copyright (c) 2017, Mapbox

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### robust-predicates

Delaunator uses robust-predicates for geometric predicates. Its upstream [Unlicense/public-domain dedication](https://github.com/mourner/robust-predicates/blob/v3.0.2/LICENSE) states:

```text
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org>
```

## Geist font

The embedded Latin variable font is [data/ui/geist-latin.woff2](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/ui/geist-latin.woff2), an unmodified download from the official Google Fonts service.

- Copyright 2024 The Geist Project Authors.
- License: **SIL Open Font License 1.1**. The complete copyright notice and license are retained in [data/ui/OFL-Geist.txt](OFL-Geist.txt).
- Upstream project: [Geist](https://github.com/vercel/geist-font).
- The exact download URL, original stylesheet, subset coverage, and file hashes are recorded in [data/ui/FONT-SOURCE.md](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/ui/FONT-SOURCE.md).

Keep the font's copyright notice and full OFL text with redistributed or embedded copies. The font license does not apply to the rest of this project.

## Natural Earth geography

**Made with Natural Earth.** [Natural Earth](https://www.naturalearthdata.com/) provides its vector and raster map data in the public domain under its [terms of use](https://www.naturalearthdata.com/about/terms-of-use/). Credit is retained here for the source authors and contributors, including Tom Patterson and Nathaniel Vaughn Kelso.

The map's [data/us-states.json](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/us-states.json) and [data/us-lakes.json](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/us-lakes.json) derive from Natural Earth's 1:10m state/province and lake layers, with 1:50m and 1:110m country layers for surrounding geography. The project's processing selects features, groups territorial subdivisions, simplifies polygon rings, and rounds coordinates. This is generalized reference geography.

The upstream layers are:

- [States and provinces, 1:10m](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson).
- [Lakes, 1:10m](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_lakes.geojson).
- [Neighboring countries and islands, 1:50m](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson).
- [Canada, Russia, and Greenland context, 1:110m](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson).

Natural Earth's public-domain terms concern the geography, not the separate lighthouse collection.

## Lighthouse records, facts, and summaries

The collection combines published inventories, official light-list records, historical references, and individual lighthouse sources. Source URLs remain attached to individual records and displayed facts; summaries retain their own citations. Records have been selected, normalized, combined, corrected, and summarized rather than presented as an unchanged upstream database.

Principal sources include:

- **Wikipedia contributors**, through the [national lighthouse list](https://en.wikipedia.org/wiki/List_of_lighthouses_in_the_United_States), state lists, and individual articles identified by each record. Article links provide access to contributor histories. The inventory's `sourceUrl`, `inventorySourceUrl`, and other source fields are retained in [data/us-lighthouses.json](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/us-lighthouses.json); revised source links and metadata are in [data/info/base-corrections.json](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/info/base-corrections.json), which the builder applies to that inventory.
- **U.S. Coast Guard Navigation Center**, for published light positions, characteristics, focal heights, and nominal ranges from its [Maritime Safety Information products](https://navcen.uscg.gov/msi) and archived Light Lists. Affected records retain exact GeoJSON/PDF URLs and range-source fields, including original values and units where supplied. Corrections distinguish current aids from historic towers and nearby replacements.
- **National Park Service**, **U.S. Coast Guard Historian's Office**, state and local agencies, lighthouse operators and preservation organizations, **Lighthouse Friends**, and **The Lighthouse Directory**. Individual fact and correction citations identify the specific source used; a general organizational mention does not replace those citations.

Wikipedia text is generally available under **Creative Commons Attribution-ShareAlike 4.0 International** and, where applicable, the **GNU Free Documentation License**, subject to the exceptions and attribution requirements in the [Wikimedia Terms of Use, section 7](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content). See the [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/). Any protectable Wikipedia-derived content retains its applicable upstream terms; this notice does not relicense all records or all source material under one license.

Per-fact source URLs and labels are retained in [data/info/profiles.json](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/info/profiles.json). Summary citations are in [data/info/summaries.json](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/info/summaries.json), and the reviewed display patterns have their own sources in [data/info/light-appearance.json](https://github.com/jpmoulton/us-lighthouse-map/blob/master/data/info/light-appearance.json). These source fields allow readers to distinguish operational fields, historical claims, corrections, and illustrative display choices, and should remain with redistributed map data.

Source citations establish provenance. They do not grant permission to redistribute the cited websites' full articles, photographs, or layouts. Those materials retain their respective rights and terms.
