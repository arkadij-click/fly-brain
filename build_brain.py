"""Compile an explicitly approximate linear response model of FAFB v783."""
import csv, gzip, hashlib, json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix, diags

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / 'codex/static/data/783'
def rows(name):
    return csv.DictReader(gzip.open(DATA/name, 'rt', encoding='utf-8'))

neurons = list(rows('neurons.csv.gz'))
ids = [r['root_id'] for r in neurons]
index = {rid:i for i,rid in enumerate(ids)}
annotations = {r['root_id']:r for r in rows('classification.csv.gz')}
names = ['odor L','odor R','vision L','vision R','touch L','touch R','taste']
B = np.zeros((len(ids),len(names)), dtype=np.float64)
groups = []
for j, (kind,side) in enumerate([('olfactory','left'),('olfactory','right'),('visual','left'),('visual','right'),('mechanosensory','left'),('mechanosensory','right'),('gustatory',None)]):
    group = [i for i,rid in enumerate(ids) if annotations[rid]['super_class']=='sensory' and annotations[rid]['class']==kind and (side is None or annotations[rid]['side']==side)]
    B[group,j] = 1
    groups.append([ids[i] for i in group])
pre,post,weight = [],[],[]
sign = [-1 if r['nt_type']=='GABA' else 1 for r in neurons]
print('Reading graph',flush=True)
for r in rows('connections_princeton.csv.gz'):
    a,b = index.get(r['pre_root_id']),index.get(r['post_root_id'])
    if a is not None and b is not None:
        pre.append(a);post.append(b);weight.append(float(r['syn_count'])*sign[a])
W = coo_matrix((weight,(post,pre)),shape=(len(ids),len(ids))).tocsr()
W.sum_duplicates()
W = diags(1/np.maximum(np.asarray(abs(W).sum(axis=1)).ravel(),1))@W
del pre,post,weight
outputs = [[i for i,rid in enumerate(ids) if annotations[rid]['super_class']=='descending' and annotations[rid]['side']==side] for side in ['left','right']]
positions = {}
for r in rows('coordinates.csv.gz'):
    if r['root_id'] not in positions:
        positions[r['root_id']] = [float(v) for v in r['position'].strip('[]').split()]
rng = np.random.default_rng(783)
sample = []
for kind,size in [('sensory',140),('optic',200),('central',200),('descending',100)]:
    candidates = [i for i,rid in enumerate(ids) if annotations[rid]['super_class']==kind and rid in positions]
    sample.extend(rng.choice(candidates,min(size,len(candidates)),replace=False).tolist())
state = .35*B
cell_kernel,output_kernel = [],[]
for k in range(48):
    cell_kernel.append(state[sample].copy())
    output_kernel.append(np.array([state[g].mean(axis=0) for g in outputs]))
    state = .65*state + .35*(W@state)
cells = np.array(cell_kernel)
out = np.array(output_kernel)
cells /= np.maximum(np.max(np.sum(abs(cells),axis=2),axis=0),1e-12)[None,:,None]
out /= np.maximum(np.sum(abs(out),axis=(0,2)),1e-12)[None,:,None]
result = dict(dataset='FAFB v783',neurons=len(ids),edges=W.nnz,inputs=names,
    input_root_ids=groups,output_root_ids=[[ids[i] for i in g] for g in outputs],
    cells=[dict(root_id=ids[i],position=positions[ids[i]],group=annotations[ids[i]]['super_class']) for i in sample],
    kernel=np.round(cells,7).tolist(),output_kernel=np.round(out,9).tolist(),
    source_sha256=hashlib.sha256((DATA/'connections_princeton.csv.gz').read_bytes()).hexdigest(),
    model='x[t+1]=0.65*x[t]+0.35*(W*x[t]+B*u[t]); normalized signed graph, GABA negative, other transmitters positive; 48-tap approximation at 20 Hz. Motor readout and behavior are authored approximations, not experimentally validated.')
(HERE/'brain.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
print(f'Built {len(ids)} neurons, {W.nnz} edges, {len(sample)} displayed cells',flush=True)
