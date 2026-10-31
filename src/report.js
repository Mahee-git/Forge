import {S, ex, get, tot, nut, burn, cnt} from './state.js';
import {bmi, bmiCat, STD} from './health.js';
import {key, shift} from './util.js';
// Builds a plain PDF in the browser (jsPDF, no server needed).
export async function pdf() {
  const {jsPDF} = await import('jspdf'), doc = new jsPDF(); let y = 18;
  const line = (t, s = 10, b = false, gap = 6) => { if (y > 280) { doc.addPage(); y = 18; } doc.setFontSize(s); doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.text(String(t), 14, y); y += gap; };
  const T = nut(), w = S.weights.at(-1), hgt = S.profile?.height, std = S.profile?.bmiStd || 'who';
  line('Forge - Progress report', 18, true, 9); line(`${S.user.displayName || S.user.email}  |  generated ${new Date().toLocaleDateString()}`); y += 3;
  line('Daily targets', 13, true); line(`${T.kcal} kcal  |  Protein ${T.p} g  |  Carbs ${T.c} g  |  Fat ${T.f} g`);
  if (w) { line(`Latest weight: ${w.kg} kg (${w.date})`); if (hgt) { const b = bmi(w.kg, hgt); line(`BMI: ${b.toFixed(1)} - ${bmiCat(b, std)} (${STD[std].name}), height ${hgt} cm`); } }
  y += 3; line('Last 30 days', 13, true);
  const head = () => { doc.setFontSize(9); doc.setFont('helvetica', 'bold'); [['Date', 14], ['Exercise', 38], ['Eaten kcal', 118], ['P / C / F g', 140], ['Burn kcal', 176]].forEach(([t, x]) => doc.text(t, x, y)); y += 6; }; head();
  for (let i = 0; i < 30; i++) {
    const k = shift(key(), -i), d = get(k), t = tot(d), items = ex().filter(e => cnt(d, e.id)).map(e => `${e.name} ${cnt(d, e.id)} ${e.unit}`);
    if (!d.meals.length && !items.length) continue;
    const ls = doc.splitTextToSize(items.join(', ') || '-', 76); if (y + ls.length * 5 > 282) { doc.addPage(); y = 18; head(); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(k, 14, y); doc.text(ls, 38, y); doc.text(String(Math.round(t.k)), 118, y); doc.text(`${Math.round(t.p)} / ${Math.round(t.c)} / ${Math.round(t.f)}`, 140, y); doc.text(String(burn(d)), 176, y); y += ls.length * 5 + 1;
  }
  if (S.weights.length) { y += 4; line('Weight log (latest 10)', 13, true); S.weights.slice(-10).reverse().forEach(x => line(`${x.date}   ${x.kg} kg`, 9, false, 5)); }
  y += 4; doc.setFontSize(8); doc.text(doc.splitTextToSize('Estimates only, not medical advice. Burn = MET (Compendium of Physical Activities) x body weight x active time; it is not subtracted from food intake.', 180), 14, y);
  doc.save('forge-report.pdf');
}
