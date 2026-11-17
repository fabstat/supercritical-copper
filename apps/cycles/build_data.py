#!/usr/bin/env python3
"""Rebuild data.js from the output of analysis step 32 (results/32_cycles.json).

    python3 apps/cycles/build_data.py path/to/32_cycles.json

Keeps the 80 sampled diagram points (S) already in data.js and replaces the example cycles (X):
for each temperature, dimension and lifetime band, the first example (boundary size closest to the band median)
whose neighborhood passes the check: no two atoms closer than MIN_PAIR (1.6 A; a liquid gives about 1.8 A or
more) and no atom inside a void's surface. Neighbors are kept out to RADIUS (4.5 A) at both temperatures, so
the two pictures show the same amount of liquid.
    RADIUS=4.5 MIN_PAIR=1.6 python3 apps/cycles/build_data.py 32_cycles.json"""
import os
import sys, json, re, pathlib
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
src = json.loads(pathlib.Path(sys.argv[1]).read_text())
old = json.loads(re.search(r'window\.CYCLE_DATA = (\{.*\});', (HERE / 'data.js').read_text(), re.S).group(1))
RADIUS = float(os.environ.get('RADIUS', 4.5)); MIN_PAIR = float(os.environ.get('MIN_PAIR', 1.6))
BAND = lambda b: 'short' if 'short' in b.lower() else ('long' if 'long' in b.lower() else 'mid')


def inside_count(V, F, A):
    """atoms enclosed by a closed triangle surface (winding number)"""
    n = 0
    for p in A:
        w = 0.0
        for f in F:
            a, b, c = (V[j] - p for j in f)
            la, lb, lc = (np.linalg.norm(v) for v in (a, b, c))
            w += 2 * np.arctan2(np.dot(a, np.cross(b, c)), la * lb * lc + np.dot(a, b) * lc + np.dot(a, c) * lb + np.dot(b, c) * la)
        n += abs(w) / (4 * np.pi) > 0.5
    return n


def assess(e, d):
    V, A, F = np.array(e['verts']), np.array(e['atoms']), e['faces']
    A = A[np.linalg.norm(A - V.mean(0), axis=1) < RADIUS] if len(A) else A
    P = np.vstack([V, A]); dd = np.linalg.norm(P[:, None] - P[None], axis=2); np.fill_diagonal(dd, 99)
    ins = inside_count(V, F, A) if int(d) == 2 else 0
    return V, A, F, float(dd.min()), ins, (dd.min() >= MIN_PAIR and ins == 0)


X, ok = [], True
for T, entry in src['temps'].items():
    for d, D in entry['dims'].items():
        bands = {}
        for e in D['examples']: bands.setdefault(BAND(e['band']), []).append(e)
        for b, exs in bands.items():
            rated = [(e,) + assess(e, d) for e in exs]
            for k, (e, V, A, F, mn, ins, good) in enumerate(rated):
                print(f'{T} K H{d} {b:5s} #{k + 1}: {len(V)} cycle atoms, {len(A)} neighbors within {RADIUS} A, '
                      f'closest pair {mn:.2f} A, inside the void: {ins}  {"ok" if good else "fails"}')
            pick = next((r for r in rated if r[-1]), max(rated, key=lambda r: r[4]))
            e, V, A, F, mn, ins, good = pick
            ok &= good
            print(f'   -> using #{rated.index(pick) + 1}' + ('' if good else '  (none passes: using the least bad)'))
            X.append({'T': int(T), 'd': int(d), 'b': b, 'bi': round(e['birth'], 1), 'de': round(e['death'], 1), 'n': int(e['n_bdry']),
                      'V': [int(round(10 * x)) for x in V.ravel()], 'F': [int(j) for f in F for j in f], 'K': len(F[0]),
                      'A': [int(round(10 * x)) for x in A.ravel()]})
head = (HERE / 'data.js').read_text().split('window.CYCLE_DATA')[0]
(HERE / 'data.js').write_text(head + 'window.CYCLE_DATA = ' + json.dumps({'S': old['S'], 'X': X}, separators=(',', ':')) + ';\n')
print('data.js written' + ('' if ok else ' — but some neighborhoods failed the check, see above'))
