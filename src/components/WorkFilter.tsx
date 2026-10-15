import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Tabs, TabsList, TabItem, TabPanel } from './ui/tabs';
import { ArrowUpRight } from 'lucide-react';
type Item={slug:string;title:string;category:string;price?:string;src:string;alt:string;width:number;height:number;href:string};
export default function WorkFilter({items}:{items:Item[]}){
  const [value,setValue]=useState('all');
  const categories=[...new Set(items.map(i=>i.category))];
  const visible=value==='all'?items:items.filter(i=>i.category===value);
  return <MotionConfig reducedMotion="user"><Tabs value={value} onValueChange={setValue}>
    <div className="works-filter"><TabsList aria-label="Категория работ"><TabItem value="all" label="Все работы" />{categories.map(category=><TabItem key={category} value={category} label={category} />)}</TabsList></div>
    <TabPanel value={value}><div className="works-list">{visible.map(item=><article className="work-tile" key={item.slug}><a href={item.href}><img src={item.src} alt={item.alt} width={item.width} height={item.height} loading="lazy" style={{viewTransitionName:`work-${item.slug}`}} /><div className="work-tile-meta"><h2>{item.title}</h2><ArrowUpRight aria-hidden size={24}/></div><p>{item.price?`${item.category} · ${item.price}`:item.category}</p></a></article>)}{!visible.length&&<p className="empty-catalog">Работ в этой категории пока нет.</p>}</div></TabPanel>
  </Tabs></MotionConfig>;
}
