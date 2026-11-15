// pages/SuperAdmin/Suivi/graphiques.jsx
// Graphiques des pages Super Admin : courbe à dégradé, anneau, jauge.
// Couleurs Miyo uniquement (orange et gris chauds, jamais de vert ni de bleu).
import React, { useId, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { nombre } from './outils';

export const PALETTE = ['#C2410C', '#F97316', '#FDBA74', '#44403C', '#A8A29E', '#9A3412', '#D6D3D1', '#78716C'];

/** Montants abrégés pour les axes : 12 k, 1,5 M */
export const court = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`;
  return nombre(v);
};

/* ------------------------------------------------------------------ */
/* Infobulle commune                                                    */
/* ------------------------------------------------------------------ */
function Bulle({ active, payload, label, format, series }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="gr-bulle">
      <div className="gr-bulle-titre">{label}</div>
      {payload.map((p) => {
        const s = series.find((x) => x.cle === p.dataKey) || {};
        return (
          <div key={p.dataKey} className="gr-bulle-ligne">
            <span className="gr-pastille" style={{ background: s.couleur || p.color }} />
            <span>{s.nom || p.name}</span>
            <strong>{(s.format || format)(p.value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Courbe à dégradé (séries dans le temps)                              */
/* series : [{ cle, nom, couleur?, pointille?, format? }]               */
/* La première série est remplie, les suivantes sont des lignes.        */
/* ------------------------------------------------------------------ */
export function Courbe({ serie = [], series, format = nombre, formatAxe = court, hauteur = 260, total }) {
  const id = useId().replace(/:/g, '');
  const liste = series.map((s, i) => ({ couleur: i === 0 ? '#C2410C' : '#78716C', ...s }));
  const vide = serie.every((m) => liste.every((s) => !Number(m[s.cle])));
  const etiquette = `${liste.map((s) => s.nom).join(', ')} : ${serie.map((m) => `${m.label} ${format(m[liste[0].cle])}`).join(', ')}`;

  return (
    <div className="gr-courbe" role="img" aria-label={etiquette}>
      {(total || liste.length > 1) && (
        <div className="gr-entete">
          {total && <div className="gr-total"><strong>{total.valeur}</strong><span>{total.libelle}</span></div>}
          {liste.length > 1 && (
            <ul className="gr-legende-ligne">
              {liste.map((s) => (
                <li key={s.cle}><span className={`gr-trait ${s.pointille ? 'is-pointille' : ''}`} style={{ borderColor: s.couleur }} />{s.nom}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div style={{ width: '100%', height: hauteur, position: 'relative' }}>
        {vide && <div className="gr-vide">Aucune donnée sur cette période</div>}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`deg-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={liste[0].couleur} stopOpacity={0.28} />
                <stop offset="100%" stopColor={liste[0].couleur} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#F0EEEC" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#A8A29E', fontSize: 11 }}
                   interval="preserveStartEnd" minTickGap={18} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#A8A29E', fontSize: 11 }} width={52}
                   tickFormatter={formatAxe} allowDecimals={false} />
            <Tooltip content={<Bulle format={format} series={liste} />} cursor={{ stroke: '#D6D3D1', strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey={liste[0].cle} name={liste[0].nom} stroke={liste[0].couleur} strokeWidth={2.5}
                  fill={`url(#deg-${id})`} dot={false}
                  activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff', fill: liste[0].couleur }} />
            {liste.slice(1).map((s) => (
              <Line key={s.cle} type="monotone" dataKey={s.cle} name={s.nom} stroke={s.couleur} strokeWidth={2}
                    strokeDasharray={s.pointille ? '5 5' : undefined} dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: s.couleur }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Anneau (répartition) avec légende numérotée                          */
/* donnees : [{ nom, valeur, couleur? }]                                */
/* ------------------------------------------------------------------ */
export function Anneau({ donnees = [], format = nombre, centre, max = 6, taille = 190 }) {
  const [actif, setActif] = useState(null);
  const parts = useMemo(() => {
    const tri = donnees.filter((d) => Number(d.valeur) > 0);
    if (tri.length <= max) return tri;
    const tete = [...tri].sort((a, b) => b.valeur - a.valeur).slice(0, max - 1);
    const reste = tri.filter((d) => !tete.includes(d)).reduce((s, d) => s + Number(d.valeur), 0);
    return [...tete, { nom: 'Autres', valeur: reste, couleur: '#D6D3D1' }];
  }, [donnees, max]);
  const total = parts.reduce((s, d) => s + Number(d.valeur), 0);
  const couleur = (d, i) => d.couleur || PALETTE[i % PALETTE.length];
  const enAvant = actif == null ? null : parts[actif];

  if (!total) return <div className="gr-vide gr-vide--bloc">Aucune donnée pour le moment</div>;

  return (
    <div className="gr-anneau">
      <div className="gr-anneau-dessin" style={{ width: taille, height: taille }}
           role="img" aria-label={parts.map((d) => `${d.nom} : ${format(d.valeur)}`).join(', ')}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={parts} dataKey="valeur" nameKey="nom" innerRadius="70%" outerRadius="100%"
                 paddingAngle={parts.length > 1 ? 2 : 0} cornerRadius={6} stroke="none"
                 startAngle={90} endAngle={-270} isAnimationActive
                 onMouseEnter={(_, i) => setActif(i)} onMouseLeave={() => setActif(null)}>
              {parts.map((d, i) => (
                <Cell key={d.nom} fill={couleur(d, i)} opacity={actif == null || actif === i ? 1 : 0.35} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="gr-anneau-centre">
          <strong>{enAvant ? `${Math.round((enAvant.valeur / total) * 100)} %` : (centre?.valeur ?? format(total))}</strong>
          <span>{enAvant ? enAvant.nom : (centre?.libelle ?? 'au total')}</span>
        </div>
      </div>
      <ol className="gr-legende">
        {parts.map((d, i) => (
          <li key={d.nom} className={actif === i ? 'is-actif' : ''}
              onMouseEnter={() => setActif(i)} onMouseLeave={() => setActif(null)}>
            <span className="gr-pastille" style={{ background: couleur(d, i) }} />
            <span className="gr-legende-nom">{d.nom}</span>
            <span className="gr-legende-val">{format(d.valeur)}</span>
            <span className="gr-legende-pct">{Math.round((d.valeur / total) * 100)} %</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Jauge demi-cercle : valeur atteinte sur un objectif                  */
/* ------------------------------------------------------------------ */
export function Jauge({ valeur = 0, objectif = 0, format = nombre, libelle, details = [] }) {
  const pct = objectif > 0 ? Math.round((valeur / objectif) * 100) : (valeur > 0 ? 100 : 0);
  const donnees = [{ nom: 'atteint', v: Math.min(100, pct) }];
  return (
    <div className="gr-jauge">
      <div className="gr-jauge-dessin" role="img" aria-label={`${libelle || ''} ${pct} %`}>
        <RadialBarChart width={240} height={130} data={donnees} cx={120} cy={120} innerRadius={92} outerRadius={118}
                        startAngle={180} endAngle={0} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="v" cornerRadius={12} fill={pct >= 100 ? '#C2410C' : '#F97316'} background={{ fill: '#F5F5F4' }} />
        </RadialBarChart>
        <div className="gr-jauge-centre">
          <strong>{pct} %</strong>
          <span>{libelle}</span>
        </div>
      </div>
      {details.length > 0 && (
        <ol className="gr-legende gr-legende--jauge">
          {details.map((d, i) => (
            <li key={d.nom}>
              <span className="gr-pastille" style={{ background: d.couleur || PALETTE[i % PALETTE.length] }} />
              <span className="gr-legende-nom">{d.nom}</span>
              <span className="gr-legende-val">{format(d.valeur)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Courbe miniature (dans une tuile de chiffre)                         */
/* ------------------------------------------------------------------ */
export function Mini({ serie = [], cle, couleur = '#C2410C', hauteur = 46 }) {
  const id = useId().replace(/:/g, '');
  return (
    <div style={{ width: '100%', height: hauteur }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={serie} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`mini-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={couleur} stopOpacity={0.3} />
              <stop offset="100%" stopColor={couleur} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={cle} stroke={couleur} strokeWidth={2} fill={`url(#mini-${id})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colonnes arrondies, la plus haute mise en avant                      */
/* ------------------------------------------------------------------ */
export function Colonnes({ serie = [], cle, nom, format = nombre, hauteur = 220 }) {
  const id = useId().replace(/:/g, '');
  const max = Math.max(0, ...serie.map((d) => Number(d[cle]) || 0));
  if (!max) return <div className="gr-vide gr-vide--bloc">Aucune donnée sur cette période</div>;
  return (
    <div style={{ width: '100%', height: hauteur }} role="img"
         aria-label={`${nom} : ${serie.filter((d) => d[cle]).map((d) => `${d.label} ${format(d[cle])}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={serie} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`col-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#F0EEEC" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#A8A29E', fontSize: 11 }} interval="preserveStartEnd" minTickGap={10} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#A8A29E', fontSize: 11 }} width={34} allowDecimals={false} tickFormatter={court} />
          <Tooltip cursor={{ fill: 'rgba(194,65,12,.06)' }} content={<Bulle format={format} series={[{ cle, nom, couleur: '#C2410C' }]} />} />
          <Bar dataKey={cle} name={nom} radius={[6, 6, 2, 2]} maxBarSize={26}>
            {serie.map((d) => (
              <Cell key={d.label} fill={Number(d[cle]) === max ? `url(#col-${id})` : '#FED7AA'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
