from pathlib import Path
import urllib.request,json,hashlib,re
root=Path(__file__).resolve().parents[1]
seen=set(); receipts=[]; dependencies=set()
def fetch(name):
    if name in seen:return
    seen.add(name)
    url=f'https://www.fluidfunctionalism.com/r/{name}.json'
    raw=urllib.request.urlopen(url).read(); item=json.loads(raw)
    receipts.append({'name':name,'url':url,'sha256':hashlib.sha256(raw).hexdigest()})
    dependencies.update(item.get('dependencies',[]))
    for dep in item.get('registryDependencies',[]):
        if dep.startswith('https://www.fluidfunctionalism.com/r/'):fetch(dep.rsplit('/',1)[-1].replace('.json',''))
    for file in item.get('files',[]):
        target=file.get('target') or re.sub(r'^registry/(?:radix/|base-ui/|default/)?','',file['path'])
        if not target or not file.get('content'):continue
        path=root/'src'/target
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(file['content'],encoding='utf-8')
fetch('tabs')
fetch('font-weight')
(root/'src/lib/utils.ts').write_text('import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs));}\n',encoding='utf-8')
(root/'docs').mkdir(exist_ok=True)
(root/'docs/fluid-provenance.json').write_text(json.dumps({'source':'Fluid Functionalism official registry','items':receipts,'dependencies':sorted(dependencies)},indent=2),encoding='utf-8')
print(json.dumps(sorted(dependencies)))
