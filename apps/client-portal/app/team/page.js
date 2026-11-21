import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import Header from '@/components/Header';
import NewClient from '@/components/NewClient';
export const dynamic = 'force-dynamic';
export default async function Team() {
  const u = await getUser();
  if (!u) redirect('/login');
  if (u.role !== 'team') redirect('/portal');
  const { results } = await (await db()).prepare("SELECT id,email,company,onboarded,ga4,google_token IS NOT NULL AS google FROM users WHERE role='client' ORDER BY created DESC").all();
  return (<><Header user={u} /><main className="wrap"><div className="page-heading"><div><span className="eyebrow">Team workspace</span><h1>Client accounts</h1><p className="mut">Manage onboarding and open each client’s performance dashboard.</p></div><div className="status-badge"><i /> {results.length} active {results.length === 1 ? 'account' : 'accounts'}</div></div>
    <div className="card mt">{results.length === 0 ? <p className="mut">No clients yet. Add your first one below.</p> :
      <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Client</th><th>Status</th><th>Google</th><th /></tr></thead><tbody>
        {results.map(c => (<tr key={c.id}><td>{c.company || c.email}<br /><span className="mut">{c.email}</span></td>
          <td><span className={'pill ' + (c.onboarded ? 'g' : 'y')}>{c.onboarded ? 'Live' : 'Onboarding'}</span></td>
          <td>{c.google ? 'Connected' : 'Not connected'}</td>
          <td className="n"><a className="btn sm ghost" href={`/portal?as=${c.id}`}>View dashboard</a></td></tr>))}
      </tbody></table></div>}
      <NewClient /></div></main></>);
}
