import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { GOALS } from '@/lib/config';
import Header from '@/components/Header';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
export const dynamic = 'force-dynamic';
export default async function Portal({ searchParams }) {
  const sp = await searchParams, u = await getUser();
  if (!u) redirect('/login');
  let c = u, viewing = false;
  if (u.role === 'team') {                       // team members only get here to view one client
    if (!sp.as) redirect('/team');
    c = await (await db()).prepare("SELECT id,email,company,goal,onboarded FROM users WHERE id=? AND role='client'").bind(sp.as).first();
    if (!c) redirect('/team');
    viewing = true;
  }
  return (<><Header user={u} />
    {!viewing && !c.onboarded ? <Onboarding user={c} step0={Math.min(3, +sp.step || 0)} />
      : <Dashboard id={c.id} viewing={viewing} name={c.company || c.email} goal={c.goal || ''} tab0={GOALS[c.goal] || 'overview'} />}</>);
}
